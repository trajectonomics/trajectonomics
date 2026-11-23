import { describe, expect, it } from "bun:test"
import { project } from "./project"
import type { RuleBook, RuleYear } from "./rule-book"
import { ruleFixture } from "./rule-fixture"
import { ruleStatements } from "./rule-statement"

const rule = { kind: "initialRate", portfolio: ["inv"], rateBps: 400, rounding: "halfUp" } as const

/** A book that holds one Rule year of the Flow `spend`, as a run would have kept it. */
function bookOf(year: Partial<RuleYear>): RuleBook {
	const kept: RuleYear = {
		date: "2028-01-01",
		portfolio: 1_000_000n,
		amount: 40_000n,
		paid: 40_000n,
		action: "none",
		...year,
	}
	return new Map([["spend", { count: 1, years: [kept] }]])
}

// Inflation of -9999 bps deflates by 1 / 0.0001 = 10,000 a year, so a Rule year two years after the start
// states real figures 10^8 times its nominal ones: the one case where a real figure outgrows a nominal.
describe("a Rule year's real figures are guarded as an estate's are (#387)", () => {
	const { scenario, timeline } = ruleFixture({ rule, inflation: -9999 })

	it("states a real figure that stays safe: 90,000,000 paid becomes 9.0e15", () => {
		const outcome = ruleStatements(bookOf({ paid: 90_000_000n }), scenario, timeline.start)
		expect("statements" in outcome && outcome.statements[0]?.years[0]?.real).toEqual({
			amount: 4_000_000_000_000,
			paid: 9_000_000_000_000_000,
		})
	})

	it("is VALUE_OVERFLOW at the Rule year's date when a real figure is past 2^53 - 1", () => {
		// 100,000,000 x 10^8 = 10^16 > 9,007,199,254,740,991, though the nominal 100,000,000 is safe.
		const outcome = ruleStatements(bookOf({ paid: 100_000_000n }), scenario, timeline.start)
		expect(outcome).toEqual({ problem: { code: "VALUE_OVERFLOW", date: "2028-01-01" } })
		const amount = ruleStatements(bookOf({ amount: 100_000_000n }), scenario, timeline.start)
		expect(amount).toEqual({ problem: { code: "VALUE_OVERFLOW", date: "2028-01-01" } })
	})

	it("is VALUE_OVERFLOW when the withdrawal rate is not a safe integer", () => {
		// 9,007,199,254,740,991 x 10,000 / 1 is far past the safe range.
		const book = bookOf({ portfolio: 1n, amount: 9_007_199_254_740_991n, paid: 0n })
		const flat = ruleFixture({ rule, inflation: 0 })
		const outcome = ruleStatements(book, flat.scenario, flat.timeline.start)
		expect(outcome).toEqual({ problem: { code: "VALUE_OVERFLOW", date: "2028-01-01" } })
	})

	it("is reached through project(): a currentRate floor with fixed growth outgrows the portfolio", () => {
		// The floor stays 100,000,000 a year while the portfolio is empty, so the third year (2028-01-01)
		// pays 100,000,000 and states it as 10^16 in real terms.
		const floored = {
			kind: "currentRate",
			portfolio: ["inv"],
			rateBps: 400,
			rounding: "halfUp",
			floor: { amount: 100_000_000, growth: { bps: 0 } },
		} as const
		const { baseline, scenario, timeline } = ruleFixture({
			rule: floored,
			inflation: -9999,
			opening: 0,
			cash: 200_000_000,
			frequency: "annual",
			horizon: "2028-03-31",
		})
		const result = project(baseline, scenario, timeline, { spendingRules: true })
		expect(result).toEqual({
			ok: false,
			problems: [{ code: "VALUE_OVERFLOW", date: "2028-01-01" }],
		})
	})
})
