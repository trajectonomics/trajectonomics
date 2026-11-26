import { describe, expect, it } from "bun:test"
import { carryInFile } from "./projection/carry-in-support"
import { errorOf, projection } from "./projection/testing"
import { runBody } from "./projection-run-support"
import { TWO_SALARIES } from "./scenario-tax-filers-plan"
import { couple, coupleHousehold, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, pay } from "./scenario-tax-separate-support"

/*
 * A Projection that starts inside 2026. Each shared-loan Levy reads the other Filer's income from
 * that Filer's own Carry-in record, so a caller's ordinary file (one record per Levy, each stating
 * only that Filer's income) keeps the one-earner rule right (cli ADR-0075, trajectonomics#619).
 */

const interest = (...values: string[]) => values.flatMap((it) => ["--mortgage-interest", it])

/** The two salaries, each through the given year-end; the partner's may start before 2026. */
function salaries(
	holderEnd: string,
	partnerEnd: string,
	partnerStart = "2026-01-01",
): Record<string, unknown> {
	return {
		...TWO_SALARIES,
		flows: [
			pay("salary", 100_000_000, { end: holderEnd }),
			pay("partner-salary", 50_000_000, { start: partnerStart, end: partnerEnd }),
		],
	}
}

/** The couple's plan filed separately, with a 60,000 loan borrowed together, and its data directory. */
async function separate(plan: Record<string, unknown>): Promise<string> {
	const home = await couple(plan, coupleHousehold())
	const res = await taxCouple(home, "married_separate", LABELS, interest("shared=60000"))
	expect(res.code, res.err).toBe(0)
	return home
}

/** One record for one Return, stating only that Filer's salary and the rest at zero. */
function record(levy: string, salary: string): Record<string, unknown> {
	const filer = levy.slice("th-2026-pit@".length)
	return {
		scenario: "base",
		levy,
		periodStart: "2026-01-01",
		tallies: [{ label: `income.section40_1@${filer}`, basis: "gross", amount: salary }],
		prepaid: "0.00",
		rest: "0.00",
	}
}

const RUN = [
	"run",
	"--scenario",
	"base",
	"--as-of",
	"2026-06-01",
	"--horizon",
	"2027-12-31",
] as const

/** The 2026 due of each Return, by Filer. */
function dues2026(res: ReturnType<typeof runBody>): Record<string, string> {
	const rows = res.taxYears.filter((it) => it.from === "2026-01-01")
	return Object.fromEntries(rows.map((it) => [it.filer ?? "", it.due]))
}

describe("a 2026 start inside the tax year", () => {
	// Both earn in 2026: the holder claims its 30,000 share, so allowances 90,000, taxable 810,000,
	//   tax 77,000; the partner's taxable 310,000, tax 8,500. The holder's record leaves the
	//   partner's salary to "rest", and the CLI reads it from the partner's own record.
	it("reads each Filer's income from their own record: 77,000 and 8,500", async () => {
		const home = await separate(salaries("2026-12-31", "2026-12-31"))
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [
				record("th-2026-pit@me", "1000000.00"),
				record("th-2026-pit@partner", "500000.00"),
			]),
		])
		expect(res.code, res.err).toBe(0)
		expect(dues2026(runBody(res))).toEqual({ me: "77000.00", partner: "8500.00" })
	})

	// The partner's salary ended in 2025, so in 2026 only the holder earns and claims all 60,000:
	//   allowances 120,000, taxable 780,000, tax 71,000; the partner has no income and owes 0.
	it("gives the whole loan to the only 2026 earner: 71,000 and 0", async () => {
		const home = await separate(salaries("2026-12-31", "2025-12-31", "2025-01-01"))
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [
				record("th-2026-pit@me", "1000000.00"),
				record("th-2026-pit@partner", "0.00"),
			]),
		])
		expect(res.code, res.err).toBe(0)
		expect(dues2026(runBody(res))).toEqual({ me: "71000.00", partner: "0.00" })
	})
})

describe("a shared loan reads the other Return's record", () => {
	it("refuses a record that states the other Filer's income differently", async () => {
		const home = await separate(salaries("2026-12-31", "2026-12-31"))
		const holder = {
			...record("th-2026-pit@me", "1000000.00"),
			tallies: [
				{ label: "income.section40_1@me", basis: "gross", amount: "1000000.00" },
				{ label: "income.section40_1@partner", basis: "gross", amount: "400000.00" },
			],
		}
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [holder, record("th-2026-pit@partner", "500000.00")]),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "document.0.tallies" })
		expect(errorOf(res).message).toContain("400000.00")
		expect(errorOf(res).message).toContain("500000.00")
	})

	it("refuses when the other Return has no record for the period", async () => {
		const home = await separate(salaries("2026-12-31", "2026-12-31"))
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [record("th-2026-pit@me", "1000000.00")]),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "document.0.tallies" })
		expect(errorOf(res).message).toContain('Return of "partner" has no Carry-in record')
	})
})
