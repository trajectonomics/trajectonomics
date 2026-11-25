import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { runBody } from "./projection-run-support"
import { TWO_SALARIES } from "./scenario-tax-filers-plan"
import { couple, coupleHousehold, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, pay } from "./scenario-tax-separate-support"

/*
 * The one-earner rule of s.47(1)(ซ) applies in every projection year, not once at the write (cli
 * ADR-0075, trajectonomics#619). Salaries of 1,000,000 and 500,000, filed separately with a 60,000
 * loan, and the partner's salary ends in 2027.
 */

const interest = (...values: string[]) => values.flatMap((it) => ["--mortgage-interest", it])

/** The two salaries, each running through the given year-end. */
function salaries(holderEnd: string, partnerEnd: string): Record<string, unknown> {
	return {
		...TWO_SALARIES,
		flows: [
			pay("salary", 100_000_000, { end: holderEnd }),
			pay("partner-salary", 50_000_000, { end: partnerEnd }),
		],
	}
}

type Run = ReturnType<typeof runBody>

/** The run from 2026 through 2030. */
async function runOf(home: string): Promise<Run> {
	return runBody(
		await projection(home, [
			"run",
			"--scenario",
			"base",
			"--as-of",
			"2026-01-01",
			"--horizon",
			"2030-12-31",
		]),
	)
}

/** One Filer's [year, due] pairs from 2026, the first year the plan earns. */
function dues(run: Run, filer: string): [string, string][] {
	return run.taxYears
		.filter((it) => it.filer === filer && it.from >= "2026-01-01")
		.map((it) => [it.from.slice(0, 4), it.due])
}

/** The holder's [year, allowances] pairs from 2026. */
function allowances(run: Run): [string, string][] {
	return run.taxYears
		.filter((it) => it.filer === "me" && it.from >= "2026-01-01")
		.map((it) => [it.from.slice(0, 4), it.walk?.allowances ?? ""])
}

/** The plan filed separately with the shared loan, which must succeed. */
async function separate(plan: Record<string, unknown>): Promise<string> {
	const home = await couple(plan, coupleHousehold())
	const res = await taxCouple(home, "married_separate", LABELS, interest("shared=60000"))
	expect(res.code, res.err).toBe(0)
	return home
}

describe("the shared interest is split in each projection year", () => {
	// 2026 and 2027, both earning: holder mortgage 30,000, allowances 60,000 + 30,000 = 90,000,
	//   taxable 810,000, tax 0 + 7,500 + 20,000 + 37,500 + 20% x 60,000 = 77,000.
	//   partner: taxable 310,000, tax 0 + 7,500 + 10% x 10,000 = 8,500.
	// From 2028 the partner has none: holder mortgage 60,000, allowances 120,000, taxable 780,000,
	//   tax 0 + 7,500 + 20,000 + 37,500 + 20% x 30,000 = 71,000; the partner owes 0.
	it("claims 30,000 while both earn and all 60,000 after the partner stops", async () => {
		const home = await separate(salaries("2030-12-31", "2027-12-31"))
		const run = await runOf(home)
		expect(dues(run, "me")).toEqual([
			["2026", "77000.00"],
			["2027", "77000.00"],
			["2028", "71000.00"],
			["2029", "71000.00"],
			["2030", "71000.00"],
		])
		expect(allowances(run)).toEqual([
			["2026", "90000.00"],
			["2027", "90000.00"],
			["2028", "120000.00"],
			["2029", "120000.00"],
			["2030", "120000.00"],
		])
		expect(dues(run, "partner")).toEqual([
			["2026", "8500.00"],
			["2027", "8500.00"],
			["2028", "0.00"],
			["2029", "0.00"],
			["2030", "0.00"],
		])
	})

	// Both earn every year, so nothing moves: the holder keeps claiming 30,000 and owes 77,000,
	//   and the partner owes 8,500, in every year.
	it("keeps the half each when both earn every year", async () => {
		const home = await separate(salaries("2030-12-31", "2030-12-31"))
		const run = await runOf(home)
		expect(dues(run, "me").map(([, due]) => due)).toEqual(Array(5).fill("77000.00"))
		expect(dues(run, "partner").map(([, due]) => due)).toEqual(Array(5).fill("8500.00"))
	})
})
