import { describe, expect, it } from "bun:test"
import type { LevyReport, Scenario } from "@trajectonomics/core/sim"
import { taxYearsOf } from "./tax-view"

/** One period of a Levy whose Measures are the ones given, in satang. */
function levyWith(measures: Record<string, number>): LevyReport[] {
	return [
		{
			id: "th-2026-pit",
			periods: [
				{
					from: "2026-01-01",
					to: "2026-12-31",
					settlementDate: "2027-03-31",
					measures: Object.entries(measures).map(([id, value]) => ({ id, value })),
					prepaid: 0,
					due: 600_000,
					settlement: 600_000,
					settled: true,
					partial: false,
				},
			],
		},
	]
}

const DOCUMENT = {} as Scenario

describe("a tax year's breakdown", () => {
	it("states the taxable income and the progressive tax beside the figure owed", () => {
		const [year] = taxYearsOf(
			levyWith({
				"taxable.income": 22_000_000,
				"tax.progressive": 350_000,
				"tax.regular": 350_000,
			}),
			"THB",
			DOCUMENT,
		)
		expect(year).toMatchObject({
			taxableIncome: "220000.00",
			progressiveTax: "3500.00",
			notes: [],
		})
	})

	it("says when the minimum tax is the larger and so the one charged (Section 48(2))", () => {
		const [year] = taxYearsOf(
			levyWith({
				"taxable.income": 22_000_000,
				"tax.progressive": 350_000,
				"tax.regular": 600_000,
			}),
			"THB",
			DOCUMENT,
		)
		expect(year?.notes).toEqual([
			"The minimum tax applied: 6000.00 on Section 40(2)–(8) income (Section 48(2)) is more than the progressive tax of 3500.00, so the extra allowances change nothing.",
		])
	})

	it("does not claim the minimum tax when only its figure before the 5,000 floor is larger", () => {
		const [year] = taxYearsOf(
			levyWith({ "tax.progressive": 200_000, "tax.minimum": 300_000, "tax.regular": 200_000 }),
			"THB",
			DOCUMENT,
		)
		expect(year?.notes).toEqual([])
	})

	it("leaves the figures out when the Levy does not report them", () => {
		const [year] = taxYearsOf(levyWith({}), "THB", DOCUMENT)
		expect(year).not.toHaveProperty("taxableIncome")
		expect(year).not.toHaveProperty("progressiveTax")
		expect(year?.notes).toEqual([])
	})
})
