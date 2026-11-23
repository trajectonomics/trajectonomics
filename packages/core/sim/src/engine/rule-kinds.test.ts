import { describe, expect, it } from "bun:test"
import { type RuleSetup, ruled, ruleFixture, statement } from "./rule-fixture"

const base = { portfolio: ["inv"], rateBps: 400, rounding: "halfUp" } as const
const band = { bps: 2000, adjustBps: 1000 }

/** Each year's `[amount, action]` of the statement. */
function years(setup: RuleSetup): readonly (readonly [number, string])[] {
	return statement(setup).years.map((year) => [year.amount, year.action] as const)
}

describe("initialRate keeps the first year's amount level in real terms", () => {
	it("4% of 100,000,000 is 4,000,000, then grows with 3% inflation: 4,120,000 and 4,243,600", () => {
		const setup = { rule: { kind: "initialRate", ...base }, inflation: 300 } as const
		expect(years(setup)).toEqual([
			[4_000_000, "none"],
			[4_120_000, "none"],
			[4_243_600, "none"],
		])
	})

	it("ignores what the portfolio is worth after the first year", () => {
		const setup = { rule: { kind: "initialRate", ...base }, rate: 500 } as const
		expect(years(setup)).toEqual([
			[4_000_000, "none"],
			[4_000_000, "none"],
			[4_000_000, "none"],
		])
	})
})

describe("currentRate follows the portfolio", () => {
	const rule = { kind: "currentRate", ...base } as const

	it("a portfolio growing 5% a year is read at 100,000,000, 105,000,000 and 110,250,000", () => {
		const { years: rows } = statement({ rule, rate: 500 })
		expect(rows.map((year) => [year.portfolio, year.amount])).toEqual([
			[100_000_000, 4_000_000],
			[105_000_000, 4_200_000],
			[110_250_000, 4_410_000],
		])
		expect(rows.map((year) => year.withdrawalRateBps)).toEqual([400, 400, 400])
	})

	it("a rate step from 2027-01-01 takes 5% of 105,000,000: 5,250,000", () => {
		const stepped = { ...rule, steps: [{ from: "2027-01-01", bps: 500 }] } as const
		expect(years({ rule: stepped, rate: 500 })).toEqual([
			[4_000_000, "none"],
			[5_250_000, "none"],
			[5_512_500, "none"],
		])
	})

	it("a floor of 4,300,000 lifts the second year from 4,200,000", () => {
		const floored = { ...rule, floor: { amount: 4_300_000, growth: { bps: 0 } } } as const
		expect(years({ rule: floored, rate: 500 })).toEqual([
			[4_300_000, "floor"],
			[4_300_000, "floor"],
			[4_410_000, "none"],
		])
	})

	it("a ceiling of 4,400,000 cuts the third year from 4,410,000", () => {
		const capped = { ...rule, ceiling: { amount: 4_400_000, growth: { bps: 0 } } } as const
		expect(years({ rule: capped, rate: 500 })).toEqual([
			[4_000_000, "none"],
			[4_200_000, "none"],
			[4_400_000, "ceiling"],
		])
	})

	it("a floor grown 10% a year crosses a fixed ceiling in 2027 and the ceiling wins", () => {
		const both = {
			...rule,
			floor: { amount: 3_900_000, growth: { bps: 1000 } },
			ceiling: { amount: 4_100_000, growth: { bps: 0 } },
		} as const
		// Floors: 3,900,000, 4,290,000, 4,719,000. The 4,000,000 first year clears 3,900,000.
		expect(years({ rule: both })).toEqual([
			[4_000_000, "none"],
			[4_100_000, "ceiling"],
			[4_100_000, "ceiling"],
		])
	})
})

describe("guardrails cut after a fall and raise after a rise", () => {
	it("a portfolio falling 10% a year is cut in 2028: 3,600,000, not in 2027", () => {
		// 2027: 4,000,000 × 10^8 = 4.0e14, not above 90,000,000 × 400 × 12,000 = 4.32e14.
		// 2028: 4.0e14 is above 81,000,000 × 400 × 12,000 = 3.888e14, so the year pays 90% of 4,000,000.
		const rule = { kind: "guardrails", ...base, upper: band, lower: band } as const
		expect(years({ rule, rate: -1000 })).toEqual([
			[4_000_000, "none"],
			[4_000_000, "none"],
			[3_600_000, "cut"],
		])
	})

	it("a portfolio rising 25% a year is raised in 2028 only: 4,400,000", () => {
		// 2027: 4.0e14 is not below 125,000,000 × 400 × 8,000 = 4.0e14. 2028: it is below 5.0e14.
		const rule = { kind: "guardrails", ...base, upper: band, lower: band } as const
		expect(years({ rule, rate: 2500 })).toEqual([
			[4_000_000, "none"],
			[4_000_000, "none"],
			[4_400_000, "raise"],
		])
	})

	it("`lower` alone raises after a rise and never cuts after a fall (a ratchet)", () => {
		const rule = { kind: "guardrails", ...base, lower: band } as const
		expect(years({ rule, rate: 2500 })[2]).toEqual([4_400_000, "raise"])
		expect(years({ rule, rate: -1000 })).toEqual([
			[4_000_000, "none"],
			[4_000_000, "none"],
			[4_000_000, "none"],
		])
	})

	it("each year starts from last year's amount grown by 3% inflation", () => {
		const rule = { kind: "guardrails", ...base, upper: band } as const
		expect(years({ rule, inflation: 300 })).toEqual([
			[4_000_000, "none"],
			[4_120_000, "none"],
			[4_243_600, "none"],
		])
	})
})

describe("every kind rounds as the rule says", () => {
	const tiny = { portfolio: ["inv"], rateBps: 1 } as const
	it("5,000 at 1 bp is a half: halfUp 1, ceil 1, floor 0", () => {
		const first = (rounding: "halfUp" | "ceil" | "floor") =>
			statement({ rule: { kind: "initialRate", ...tiny, rounding }, opening: 5_000 }).years[0]!
				.amount
		expect([first("halfUp"), first("ceil"), first("floor")]).toEqual([1, 1, 0])
	})
})

describe("the statement and the rows agree", () => {
	it("annual expense in each roll-up is the year's paid amount", () => {
		const rule = { kind: "currentRate", ...base } as const
		const projection = ruled(ruleFixture({ rule, rate: 500 }))
		expect(projection.annual.map((year) => year.expense)).toEqual([4_000_000, 4_200_000, 4_410_000])
		expect(projection.spendingRules![0]!.years.map((year) => year.paid)).toEqual([
			4_000_000, 4_200_000, 4_410_000,
		])
	})
})
