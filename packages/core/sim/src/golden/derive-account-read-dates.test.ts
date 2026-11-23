import { describe, expect, it } from "bun:test"
import { derivedIncome, expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { check, financialIndependence } from "../index"
import type { Derive, SurvivalOptions } from "../types"

/** A bonus of (inv - 1,000,000) / 1,000: it prices an Account's value on the date it lands. */
const bonus: Derive = {
	measures: [
		{ id: "value", op: "account", account: "inv" },
		{ id: "floor", op: "const", value: 1_000_000 },
		{ id: "excess", op: "sub", a: "value", b: "floor" },
		{ id: "share", op: "scale", of: "excess", num: 1, den: 1000, rounding: "halfUp" },
	],
	result: "share",
}
const monthly = { frequency: "monthly", start: "2026-01-01" } as const

/**
 * The bonus lands each 15 June. Stopping the salary from any candidate month leaves the candidate
 * with no bonus, but the original plan's window still prices it, so the walk must hold inv on that
 * date although the candidate lands nothing there.
 */
const fixture = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "inv", kind: "asset", rate: 500 },
	],
	balances: { cash: 600_000, inv: 60_000_000 },
	flows: [
		income("salary", 500_000, monthly),
		expense("living", 150_000, monthly),
		derivedIncome("bonus", bonus, { frequency: "annual", start: "2026-06-15" }),
	],
	surplus: [{ account: "inv" }],
	withdraw: ["cash", "inv"],
	start: "2026-01-01",
	horizon: "2031-01-01",
	resolution: "month",
})

describe("a window that prices a Derived amount on a date the candidate lands nothing", () => {
	const reference = { multiplier: 25, basis: "netWorth", window: "next12Months", terms: "nominal" }

	it("is accepted by check()", () => {
		expect(check(fixture.baseline, fixture.scenario, fixture.timeline)).toEqual([])
	})

	for (const minBufferMonths of [0, 3]) {
		it(`reads inv on 2026-06-15 with a buffer of ${minBufferMonths} months: FI 2026-01-01, 1,800,000`, () => {
			// Living 150,000 x 12 is the whole of the expenses: the bonus is income, never an expense.
			const options = { method: "survival", minBufferMonths, reference } as SurvivalOptions
			const result = financialIndependence(
				fixture.baseline,
				fixture.scenario,
				fixture.timeline,
				options,
			)
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			if (!result.financialIndependence.reachable) throw new Error("FI not reachable")
			const { month, reference: found } = result.financialIndependence
			expect({ month, annualExpenses: BigInt(found!.annualExpenses) }).toEqual({
				month: "2026-01-01",
				annualExpenses: 1_800_000n,
			})
		})
	}
})
