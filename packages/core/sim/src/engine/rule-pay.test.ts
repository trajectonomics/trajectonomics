import { describe, expect, it } from "bun:test"
import { project } from "./project"
import { ruled, ruleFixture, statement } from "./rule-fixture"
import { makeFixture } from "./test-helpers"
import { ruledExpense } from "./test-rules"

const initial = {
	kind: "initialRate",
	portfolio: ["inv"],
	rateBps: 400,
	rounding: "halfUp",
} as const

/** What the rule's Flow took out of cash in each reported month. */
function monthly(setup: Parameters<typeof ruleFixture>[0]): readonly number[] {
	const cash = ruled(ruleFixture(setup)).rows.map(
		(row) => row.balances.find((balance) => balance.account === "cash")!.amount,
	)
	const drops = cash.map(
		(amount, index) => (index === 0 ? 10_000_000_000 : cash[index - 1]!) - amount,
	)
	return drops.slice(0, 12)
}

describe("a Rule year pays its amount in equal parts that add to it exactly", () => {
	it("4,000,000 over twelve months pays 333,333 twice then 333,334, four times", () => {
		const parts = monthly({ rule: initial, horizon: "2026-12-31" })
		expect(parts).toEqual([
			333_333, 333_333, 333_334, 333_333, 333_333, 333_334, 333_333, 333_333, 333_334, 333_333,
			333_333, 333_334,
		])
		expect(parts.reduce((sum, part) => sum + part, 0)).toBe(4_000_000)
	})

	it("an amount of 7 over twelve months pays 0 or 1 and adds to 7: the floor of 7k/12 less 7(k-1)/12", () => {
		const tiny = { ...initial, rateBps: 7, rounding: "floor" } as const
		const parts = monthly({ rule: tiny, opening: 10_000, horizon: "2026-12-31" })
		// 10,000 × 7 / 10000 = 7. floor(7k/12) for k = 1..12: 0 1 1 2 2 3 4 4 5 5 6 7.
		expect(parts).toEqual([0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1])
	})

	it("an annual Flow pays the whole amount once a year", () => {
		const { years } = statement({ rule: initial, frequency: "annual", inflation: 300 })
		expect(years.map((year) => [year.date, year.amount, year.paid])).toEqual([
			["2026-01-01", 4_000_000, 4_000_000],
			["2027-01-01", 4_120_000, 4_120_000],
			["2028-01-01", 4_243_600, 4_243_600],
		])
	})
})

describe("a Rule year cut short pays only its Occurrences", () => {
	it("the horizon on 2026-07-01 ends the year after seven parts: 2,333,333 of 4,000,000", () => {
		const [year] = statement({ rule: initial, horizon: "2026-07-01" }).years
		expect([year?.amount, year?.paid]).toEqual([4_000_000, 2_333_333])
	})

	it("a Shortfall on 2026-04-01 pays the four planned parts, 1,333,333", () => {
		const fixture = ruleFixture({ rule: initial, cash: 1_000_000 })
		const result = project(fixture.baseline, fixture.scenario, fixture.timeline, {
			spendingRules: true,
		})
		if (!result.ok) throw new Error("expected a Projection")
		expect(result.projection.runsOut?.date).toBe("2026-04-01")
		expect(result.projection.spendingRules![0]!.years.map((year) => year.paid)).toEqual([1_333_333])
	})
})

describe("the portfolio", () => {
	it("sums every Account it names: 60,000,000 and 40,000,000 read as 100,000,000", () => {
		const both = { ...initial, portfolio: ["inv", "rmf"] } as const
		const fixture = makeFixture({
			accounts: [
				{ id: "cash", kind: "asset", rate: 0 },
				{ id: "inv", kind: "asset", rate: 0 },
				{ id: "rmf", kind: "asset", rate: 0, lockedUntil: "2040-01-01" },
			],
			balances: { cash: 10_000_000_000, inv: 60_000_000, rmf: 40_000_000 },
			flows: [ruledExpense("spend", both)],
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			horizon: "2026-12-31",
		})
		const result = project(fixture.baseline, fixture.scenario, fixture.timeline, {
			spendingRules: true,
		})
		if (!result.ok) throw new Error("expected a Projection")
		const [year] = result.projection.spendingRules![0]!.years
		expect([year?.portfolio, year?.amount]).toEqual([100_000_000, 4_000_000])
	})

	it("is read before the date's Flows land: the first date reads the opening value", () => {
		const [year] = statement({ rule: initial, opening: 100_000_000 }).years
		expect(year?.portfolio).toBe(100_000_000)
	})

	it("a portfolio of 0 has no withdrawal rate and pays 0", () => {
		const [year] = statement({ rule: initial, opening: 0 }).years
		expect(year).toEqual({
			date: "2026-01-01",
			portfolio: 0,
			amount: 0,
			paid: 0,
			action: "none",
		})
	})
})

describe("the statement is opt-in", () => {
	it("a Projection without the option has no `spendingRules` key", () => {
		const { baseline, scenario, timeline } = ruleFixture({ rule: initial })
		const result = project(baseline, scenario, timeline)
		if (!result.ok) throw new Error("expected a Projection")
		expect("spendingRules" in result.projection).toBe(false)
	})
})
