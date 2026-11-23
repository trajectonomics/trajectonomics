import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import type { Estate, EstateStatement } from "../types"
import { household, withEstate } from "./test-household"

function statements(fixture: Fixture): readonly EstateStatement[] {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, { estate: true })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection.estate!
}

function on(fixture: Fixture, date: string): EstateStatement {
	return statements(fixture).find((statement) => statement.date === date)!
}

const costs: Estate["costs"] = [
	{ id: "settlement", of: "gross", bps: 200, rounding: "halfUp" },
	{ id: "home-sale", of: { accounts: ["home"] }, bps: 500, rounding: "halfUp" },
	{ id: "lawyer", amount: 100_000, growth: "inflation" },
]

describe("an estate worked by hand: cash 1,000,000, home 5,000,000, locked fund 2,000,000, loan 3,000,000", () => {
	const plan = withEstate(household(), {
		costs,
		gifts: [{ id: "temple", of: "net", bps: 1000, rounding: "floor" }],
	})

	it("states gross with the home and the locked fund, and the loan as a debt", () => {
		const at = on(plan, "2026-01-01")
		expect([at.gross, at.debts]).toEqual([8_000_000, 3_000_000])
	})

	it("takes 2% of gross, 5% of the home and the lawyer's fixed amount; the gift is 10% of net", () => {
		const at = on(plan, "2026-01-01")
		expect(at.costs).toEqual([
			{ id: "settlement", amount: 160_000 },
			{ id: "home-sale", amount: 250_000 },
			{ id: "lawyer", amount: 100_000 },
		])
		expect(at.net).toBe(4_490_000)
		expect(at.gifts).toEqual([{ id: "temple", amount: 449_000 }])
		expect(at.toHeirs).toBe(4_041_000)
	})

	it("grows the fixed amount by whole years of inflation: 103,000 then 106,090", () => {
		expect(on(plan, "2027-01-01").costs[2]!.amount).toBe(103_000)
		expect(on(plan, "2028-01-01").costs[2]!.amount).toBe(106_090)
		expect(on(plan, "2026-12-01").costs[2]!.amount).toBe(100_000)
	})

	it("deflates each part once at one year: real net 4,356,312 and real toHeirs 3,920,681", () => {
		// realNetWorth = 970,874 + 4,854,369 + 1,941,748 − 2,912,621 = 4,854,370; the costs deflate to
		// 155,340 + 242,718 + 100,000 = 498,058, and the gift 448,700 / 1.03 to 435,631.
		const at = on(plan, "2027-01-01")
		expect([at.net, at.toHeirs]).toEqual([4_487_000, 4_038_300])
		expect(at.real).toEqual({ net: 4_356_312, toHeirs: 3_920_681 })
		expect(on(plan, "2026-01-01").real).toEqual({ net: 4_490_000, toHeirs: 4_041_000 })
	})

	it("holds gross − debts − costs − gifts = toHeirs on every row", () => {
		for (const at of statements(plan)) {
			const taken = at.costs.reduce((sum, line) => sum + line.amount, 0)
			const given = at.gifts.reduce((sum, line) => sum + line.amount, 0)
			expect(at.gross - at.debts - taken - given).toBe(at.toHeirs)
		}
	})
})

describe("gifts and a shortfall", () => {
	it("caps a later gift at what the earlier one left: 3,000,000 then 1,490,000 of 4,490,000", () => {
		const plan = withEstate(household(), {
			costs,
			gifts: [
				{ id: "charity", amount: 3_000_000, growth: { bps: 0 } },
				{ id: "family", of: "net", bps: 5000, rounding: "halfUp" },
			],
		})
		const at = on(plan, "2026-01-01")
		expect(at.gifts).toEqual([
			{ id: "charity", amount: 3_000_000 },
			{ id: "family", amount: 1_490_000 },
		])
		expect(at.toHeirs).toBe(0)
	})

	it("states a negative net as it is, with every gift 0 and heirs 0: 8,000,000 − 9,000,000 − 160,000", () => {
		const plan = withEstate(
			household({ cash: 1_000_000, home: 5_000_000, fund: 2_000_000, loan: 9_000_000 }),
			{
				costs: [{ id: "settlement", of: "gross", bps: 200, rounding: "halfUp" }],
				gifts: [
					{ id: "temple", of: "net", bps: 1000, rounding: "floor" },
					{ id: "fixed", amount: 50_000, growth: "inflation" },
				],
			},
		)
		const at = on(plan, "2026-01-01")
		expect(at.net).toBe(-1_160_000)
		expect(at.gifts).toEqual([
			{ id: "temple", amount: 0 },
			{ id: "fixed", amount: 0 },
		])
		expect([at.toHeirs, at.real.toHeirs]).toEqual([0, 0])
		// 970,874 + 4,854,369 + 1,941,748 − 8,737,864 − 155,340 at one year
		expect(on(plan, "2027-01-01").real.net).toBe(-1_126_213)
	})

	it("rounds a tie as the line says: 10% of 25 is 2.5, so floor 2, halfUp 3, ceil 3", () => {
		const base = household({ cash: 25, home: 0, fund: 0, loan: 0 })
		const rounded = (rounding: "floor" | "halfUp" | "ceil") =>
			on(withEstate(base, { costs: [{ id: "c", of: "gross", bps: 1000, rounding }] }), "2026-01-01")
				.costs[0]!.amount
		expect([rounded("floor"), rounded("halfUp"), rounded("ceil")]).toEqual([2, 3, 3])
	})
})
