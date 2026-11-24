import { describe, expect, it } from "bun:test"
import { TaxValidationError } from "../../core/money"
import { TH_2026_PARAMETERS } from "../parameters"
import { thBracketWalk } from "../walk"
import { forAllSeeded } from "./invariants-random"

/** THB to satang, for readable hand-computed cases. */
const baht = (amount: number): number => amount * 100

/** The figures of a walk's slices that the cases below compute by hand: income and tax in THB. */
function figures(taxable: number): { income: number[]; tax: number[] } {
	const { slices } = thBracketWalk(baht(taxable))
	return { income: slices.map((s) => s.income / 100), tax: slices.map((s) => s.tax / 100) }
}

describe("thBracketWalk (hand-computed, Section 48(1) schedule)", () => {
	it("walks an income inside the 10% bracket", () => {
		// 150,000 at 0%, 150,000 at 5% (7,500), 100,000 at 10% (10,000): 17,500 in all.
		expect(figures(400_000)).toEqual({
			income: [150_000, 150_000, 100_000, 0, 0, 0, 0, 0],
			tax: [0, 7_500, 10_000, 0, 0, 0, 0, 0],
		})
		const walk = thBracketWalk(baht(400_000))
		expect(walk.progressiveTax).toBe(baht(17_500))
		expect(walk.marginalRateBps).toBe(1000)
		expect(walk.toNextBracket).toBe(baht(100_000))
	})

	it("states each slice with its edges and its rate in basis points", () => {
		const { slices } = thBracketWalk(baht(400_000))
		expect(slices.map((s) => [s.from, s.upTo, s.rateBps])).toEqual([
			[0, baht(150_000), 0],
			[baht(150_000), baht(300_000), 500],
			[baht(300_000), baht(500_000), 1000],
			[baht(500_000), baht(750_000), 1500],
			[baht(750_000), baht(1_000_000), 2000],
			[baht(1_000_000), baht(2_000_000), 2500],
			[baht(2_000_000), baht(5_000_000), 3000],
			[baht(5_000_000), null, 3500],
		])
	})

	it("keeps an income exactly on a bracket edge in the bracket it closes, with nothing left", () => {
		const walk = thBracketWalk(baht(300_000))
		expect(walk.progressiveTax).toBe(baht(7_500))
		expect(walk.marginalRateBps).toBe(500)
		expect(walk.toNextBracket).toBe(0)
		expect(walk.slices[2]?.income).toBe(0)
	})

	it("has no toNextBracket in the top bracket", () => {
		// 7,500 + 20,000 + 37,500 + 50,000 + 250,000 + 900,000 + 350,000 on 6,000,000.
		const walk = thBracketWalk(baht(6_000_000))
		expect(walk.progressiveTax).toBe(baht(1_615_000))
		expect(walk.marginalRateBps).toBe(3500)
		expect(walk).not.toHaveProperty("toNextBracket")
		expect(walk.slices[7]?.income).toBe(baht(1_000_000))
	})

	it("is at 0% below the first taxed bracket, with room to its end", () => {
		const walk = thBracketWalk(baht(100_000))
		expect(walk.progressiveTax).toBe(0)
		expect(walk.marginalRateBps).toBe(0)
		expect(walk.toNextBracket).toBe(baht(50_000))
	})

	it("walks no income as the first bracket with all of it left", () => {
		const walk = thBracketWalk(0)
		expect(walk.progressiveTax).toBe(0)
		expect(walk.marginalRateBps).toBe(0)
		expect(walk.toNextBracket).toBe(baht(150_000))
		expect(walk.slices.every((s) => s.income === 0 && s.tax === 0)).toBe(true)
	})

	it("rounds a half-satang slice up, as the Levy does (5% of 10 satang)", () => {
		const walk = thBracketWalk(baht(150_000) + 10)
		expect(walk.progressiveTax).toBe(1)
		expect(walk.slices[1]).toMatchObject({ income: 10, tax: 1, rateBps: 500 })
	})

	it("reads a rate with four decimals exactly in basis points", () => {
		const walk = thBracketWalk(baht(100), [{ upTo: null, rate: 0.0725 }])
		expect(walk.slices[0]?.rateBps).toBe(725)
		expect(walk.marginalRateBps).toBe(725)
	})

	it("refuses an income that is negative or not whole satang", () => {
		expect(() => thBracketWalk(-1)).toThrow(TaxValidationError)
		expect(() => thBracketWalk(0.5)).toThrow(TaxValidationError)
	})
})

describe("thBracketWalk (property)", () => {
	it("slices sum to the taxable income and taxes to the progressive tax, and the marginal bracket holds the last satang", () => {
		forAllSeeded(
			"the slices sum",
			87_404,
			2_000,
			(rng) => (rng.bool(4) ? rng.int(0, baht(10_000_000)) : rng.int(0, baht(1_200_000))),
			(taxable) => {
				const walk = thBracketWalk(taxable)
				expect(walk.slices.reduce((sum, s) => sum + s.income, 0)).toBe(taxable)
				expect(walk.slices.reduce((sum, s) => sum + s.tax, 0)).toBe(walk.progressiveTax)
				expect(walk.slices).toHaveLength(TH_2026_PARAMETERS.brackets.length)
				const home = walk.slices.find(
					(s) => taxable > s.from && (s.upTo === null || taxable <= s.upTo),
				)
				expect(walk.marginalRateBps).toBe(home?.rateBps ?? 0)
				expect(walk.toNextBracket ?? null).toBe(
					home?.upTo === undefined || home.upTo === null ? null : home.upTo - taxable,
				)
			},
		)
	})
})
