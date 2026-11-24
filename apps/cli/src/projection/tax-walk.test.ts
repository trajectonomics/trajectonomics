import { describe, expect, it } from "bun:test"
import type { LevyReport, Scenario } from "@trajectonomics/core/sim"
import { taxYearsOf } from "./tax-view"

/** The Measures of a Thai Levy the CLI emitted, in satang, for a year with the figures given. */
function emitted(figures: {
	assessable: number
	expenses: number
	allowances: number
	taxable: number
	progressive: number
	regular?: number
}): Record<string, number> {
	return {
		"assessable.total": figures.assessable,
		"expenses.total": figures.expenses,
		"allowances.total": figures.allowances,
		"taxable.income": figures.taxable,
		"tax.progressive": figures.progressive,
		"tax.regular": figures.regular ?? figures.progressive,
	}
}

/** One tax year of a Levy with those Measures and that `due`, as the CLI reports it. */
function yearOf(measures: Record<string, number>, due: number) {
	const levies: LevyReport[] = [
		{
			id: "th-2026-pit",
			periods: [
				{
					from: "2026-01-01",
					to: "2026-12-31",
					settlementDate: "2027-03-31",
					measures: Object.entries(measures).map(([id, value]) => ({ id, value })),
					prepaid: 0,
					due,
					settlement: due,
					settled: true,
					partial: false,
				},
			],
		},
	]
	const [year] = taxYearsOf(levies, "THB", {} as Scenario)
	if (year === undefined) throw new Error("no tax year")
	return year
}

/** The bracket rows as [rateBps, income, tax]: the part of the walk a hand computation checks. */
function rowsOf(year: ReturnType<typeof yearOf>): [number, string, string][] {
	return (year.brackets ?? []).map((b) => [b.rateBps, b.income, b.tax])
}

describe("a tax year's walk, brackets and rates (ADR-0036)", () => {
	it("walks an income inside the 10% bracket", () => {
		// 560,000 less 100,000 and 60,000 is 400,000: 0 + 7,500 + 10,000 = 17,500; 1,750,000 x 10000
		// / 56,000,000 is 312.5, so 312.
		const year = yearOf(
			emitted({
				assessable: 56_000_000,
				expenses: 10_000_000,
				allowances: 6_000_000,
				taxable: 40_000_000,
				progressive: 1_750_000,
			}),
			1_750_000,
		)
		expect(year.walk).toEqual({
			assessable: "560000.00",
			expenses: "100000.00",
			allowances: "60000.00",
			taxableIncome: "400000.00",
		})
		expect(rowsOf(year).slice(0, 4)).toEqual([
			[0, "150000.00", "0.00"],
			[500, "150000.00", "7500.00"],
			[1000, "100000.00", "10000.00"],
			[1500, "0.00", "0.00"],
		])
		expect(year).toMatchObject({
			marginalRateBps: 1000,
			toNextBracket: "100000.00",
			effectiveRateBps: 312,
			notes: [],
		})
		expect(year.brackets?.[7]).toEqual({
			from: "5000000.00",
			upTo: null,
			rateBps: 3500,
			income: "0.00",
			tax: "0.00",
		})
	})

	it("keeps an income exactly on a bracket edge in the bracket it closes", () => {
		// 300,000 taxable: 7,500 tax; 750,000 x 10000 / 40,000,000 is 187.5, so 187.
		const year = yearOf(
			emitted({
				assessable: 40_000_000,
				expenses: 5_000_000,
				allowances: 5_000_000,
				taxable: 30_000_000,
				progressive: 750_000,
			}),
			750_000,
		)
		expect(year).toMatchObject({
			marginalRateBps: 500,
			toNextBracket: "0.00",
			effectiveRateBps: 187,
		})
	})

	it("has no toNextBracket in the top bracket", () => {
		// 6,000,000 taxable: 1,615,000 tax; 161,500,000 x 10000 / 700,000,000 is 2307.1, so 2307.
		const year = yearOf(
			emitted({
				assessable: 700_000_000,
				expenses: 10_000_000,
				allowances: 90_000_000,
				taxable: 600_000_000,
				progressive: 161_500_000,
			}),
			161_500_000,
		)
		expect(year.marginalRateBps).toBe(3500)
		expect(year.effectiveRateBps).toBe(2307)
		expect(year).not.toHaveProperty("toNextBracket")
	})

	it("is at 0% below the first taxed bracket", () => {
		const year = yearOf(
			emitted({
				assessable: 20_000_000,
				expenses: 5_000_000,
				allowances: 5_000_000,
				taxable: 10_000_000,
				progressive: 0,
			}),
			0,
		)
		expect(year).toMatchObject({
			marginalRateBps: 0,
			toNextBracket: "50000.00",
			effectiveRateBps: 0,
		})
		expect(rowsOf(year)[0]).toEqual([0, "100000.00", "0.00"])
	})

	it("states no effective rate when nothing was assessed", () => {
		const year = yearOf(
			emitted({ assessable: 0, expenses: 0, allowances: 0, taxable: 0, progressive: 0 }),
			0,
		)
		expect(year.walk?.assessable).toBe("0.00")
		expect(year.marginalRateBps).toBe(0)
		expect(year).not.toHaveProperty("effectiveRateBps")
	})

	it("says the brackets do not set the tax when the minimum tax is the one charged", () => {
		// 220,000 taxable gives 3,500 progressive tax; the minimum tax of 6,000 is the larger.
		const year = yearOf(
			emitted({
				assessable: 120_000_000,
				expenses: 90_000_000,
				allowances: 8_000_000,
				taxable: 22_000_000,
				progressive: 350_000,
				regular: 600_000,
			}),
			600_000,
		)
		expect(year.notes).toEqual([
			"The minimum tax applied: 6000.00 on Section 40(2)–(8) income (Section 48(2)) is more than the progressive tax of 3500.00, so the extra allowances change nothing.",
			"The brackets do not set the tax this year: the minimum tax does. The brackets and the marginal rate describe the progressive tax of 3500.00 only.",
		])
		expect(year).toMatchObject({ marginalRateBps: 500, effectiveRateBps: 50 })
		expect(rowsOf(year)[1]).toEqual([500, "70000.00", "3500.00"])
	})

	it("gives a Levy the CLI did not emit none of the fields", () => {
		const year = yearOf({ "taxable.income": 22_000_000, "tax.progressive": 350_000 }, 350_000)
		for (const field of [
			"walk",
			"brackets",
			"marginalRateBps",
			"toNextBracket",
			"effectiveRateBps",
		])
			expect(year).not.toHaveProperty(field)
	})

	it("gives a Levy whose progressive tax is not the schedule's the walk and no brackets", () => {
		const year = yearOf(
			emitted({
				assessable: 56_000_000,
				expenses: 10_000_000,
				allowances: 6_000_000,
				taxable: 40_000_000,
				progressive: 1_000_000,
			}),
			1_000_000,
		)
		expect(year.walk?.taxableIncome).toBe("400000.00")
		// The effective rate does not use the table: 1,000,000 x 10000 / 56,000,000 is 178.5, so 178.
		expect(year.effectiveRateBps).toBe(178)
		for (const field of ["brackets", "marginalRateBps", "toNextBracket"])
			expect(year).not.toHaveProperty(field)
		expect(year.notes).toEqual([
			"The brackets are not stated: this Levy's progressive tax of 10000.00 is not what the Section 48(1) schedule gives on 400000.00 of taxable income, so it was emitted from another table.",
		])
	})
})
