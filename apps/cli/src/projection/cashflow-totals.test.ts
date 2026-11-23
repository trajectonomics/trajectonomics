import { describe, expect, it } from "bun:test"
import { isAppError } from "../errors"
import { cashflowTotalsOf, type RollupFigures } from "./cashflow-totals"

/*
 * The section totals sum in BigInt (cli ADR-0058, addendum): each engine figure is a safe integer, but
 * their sum may not be, and then the run is refused as `VALUE_OVERFLOW` rather than rounded.
 */

const NONE: RollupFigures = {
	income: "0.00",
	expense: "0.00",
	contributions: "0.00",
	unfundedContributions: "0.00",
	unmet: "0.00",
}
// The largest safe integer, 9,007,199,254,740,991 satang, is 90,071,992,547,409.91 THB.
const LARGEST = "90071992547409.91"

describe("an exact total", () => {
	it("states a sum that reaches the largest safe integer", () => {
		const totals = cashflowTotalsOf(
			{ ...NONE, income: "90071992547409.90" },
			[{ group: "withdrawal", amount: "0.01" }],
			"THB",
			"2030-12-31",
		)
		expect(isAppError(totals) ? undefined : totals["money in"]).toBe(Number.MAX_SAFE_INTEGER)
	})

	it("refuses a sum one satang past it as VALUE_OVERFLOW on the roll-up's last date", () => {
		const totals = cashflowTotalsOf(
			{ ...NONE, income: LARGEST },
			[{ group: "withdrawal", amount: "0.01" }],
			"THB",
			"2030-12-31",
		)
		expect(isAppError(totals)).toBe(true)
		expect(isAppError(totals) ? totals.body : undefined).toMatchObject({
			code: "projection_refused",
			details: [{ code: "VALUE_OVERFLOW", date: "2030-12-31" }],
		})
	})

	it("refuses lines that add past it even when each is safe", () => {
		const line = { group: "surplus", amount: LARGEST }
		const totals = cashflowTotalsOf(NONE, [line, line], "THB", "2031-12-31")
		expect(isAppError(totals)).toBe(true)
	})
})
