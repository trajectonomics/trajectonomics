import { describe, expect, it } from "bun:test"
import { carryInFile, TH_CLASSES } from "./projection/carry-in-support"
import { errorOf, projection } from "./projection/testing"
import { runBody } from "./projection-run-support"
import { fullRecord, record, salaries, separate } from "./scenario-tax-separate-shared-support"

/*
 * A projection that starts in 2027, before the 2026 tax year is settled, takes a 2026 record for
 * only one Return: the other gets the CLI's own scope record, which says the period is not
 * recomputed (cli ADR-0032), not that its Filer had no income. So the shared-loan fill reads nothing
 * from it, and the one-earner rule never takes the partner as having earned nothing (cli ADR-0075).
 */

/** The flags of a run that starts inside 2027, with 2026 not yet settled. */
const RUN_2027 = ["run", "--scenario", "base", "--as-of", "2027-02-01", "--horizon", "2028-12-31"]

/** Each Return's 2027 record: its own salary so far and the rest at zero. */
const records2027 = [
	{ ...record("th-2026-pit@me", "0.00"), periodStart: "2027-01-01" },
	{ ...record("th-2026-pit@partner", "0.00"), periodStart: "2027-01-01" },
]

/** The partner's 22 income classes, with the salary at the given amount, for the holder's record. */
function partnerIncome(salary: string): { label: string; basis: string; amount: string }[] {
	return TH_CLASSES.filter((it) => it.label.startsWith("income.")).map(({ label, basis }) => ({
		label: `${label}@partner`,
		basis,
		amount: label === "income.section40_1" ? salary : "0.00",
	}))
}

/** The holder's 2026 record: its own 29 classes, the shared 22, and the partner's income when given. */
function holder2026(shared: string, partner?: string): Record<string, unknown> {
	const own = fullRecord("th-2026-pit@me", "1000000.00", shared)
	const tallies = own["tallies"] as unknown[]
	return partner === undefined ? own : { ...own, tallies: [...tallies, ...partnerIncome(partner)] }
}

/** The holder's 2026 due in a run with the given 2026 record. */
async function holderDue2026(home: string, record2026: Record<string, unknown>) {
	const res = await projection(home, [
		...RUN_2027,
		"--carry-in",
		carryInFile(home, [record2026, ...records2027]),
	])
	return res
}

describe("a 2026 record for one Return of a shared-loan pair, run from 2027", () => {
	// The partner's 2026 Return has only the scope record, so nothing says what the partner earned.
	// main read the gap as no income and the holder claimed the whole loan (71,000, not 77,000).
	it("refuses the partner's income the holder's record leaves out", async () => {
		const home = await separate(salaries("2028-12-31", "2028-12-31"))
		const res = await holderDue2026(home, holder2026("0.00"))
		expect(res.code).toBe(2)
		expect(errorOf(res).message).toContain("@partner")
		expect(errorOf(res).message).toContain("no Carry-in record of its own")
		expect(errorOf(res).message).not.toContain('"rest"')
	})

	// Holder: 1,000,000 - expenses 100,000 - allowances 60,000 + 30,000 (both earn) = 810,000
	// taxable; tax 7,500 + 20,000 + 37,500 + 20% x 60,000 = 77,000.
	it("gives 77,000 when the holder's record states the partner's income", async () => {
		const home = await separate(salaries("2028-12-31", "2028-12-31"))
		const res = await holderDue2026(home, holder2026("0.00", "500000.00"))
		expect(res.code, res.err).toBe(0)
		const row = runBody(res).taxYears.find((it) => it.from === "2026-01-01" && it.filer === "me")
		expect(row?.due).toBe("77000.00")
	})

	// Holder: 1,000,000 + half of 100,000 shared = 1,050,000; expenses 100,000; allowances 90,000;
	// taxable 860,000; tax 7,500 + 20,000 + 37,500 + 20% x 110,000 = 87,000. The scope record does
	// not state the shared income as 0, so the holder's own 100,000 stands.
	it("keeps the holder's shared income against the scope record", async () => {
		const home = await separate(salaries("2028-12-31", "2028-12-31"))
		const res = await holderDue2026(home, holder2026("100000.00", "500000.00"))
		expect(res.code, res.err).toBe(0)
		const row = runBody(res).taxYears.find((it) => it.from === "2026-01-01" && it.filer === "me")
		expect(row?.due).toBe("87000.00")
	})

	// The holder's own 29 classes only: neither record names the shared income, and the scope record
	// cannot, so it is refused rather than read as none.
	it("refuses a record that names neither the shared nor the partner's income", async () => {
		const home = await separate(salaries("2028-12-31", "2028-12-31"))
		const res = await holderDue2026(home, fullRecord("th-2026-pit@me", "1000000.00"))
		expect(res.code).toBe(2)
		expect(errorOf(res).code).toBe("invalid_input")
	})
})
