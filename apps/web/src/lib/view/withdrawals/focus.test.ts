import { describe, expect, test } from "bun:test"
import type { ProjectionRun } from "../../contract"
import { BASE } from "../compare/fixtures.test-support"
import { withdrawalsFocusView } from "./focus"
import { withdrawalsView } from "./view"

/** A projection with two spending-rule years, so the columns and the first tick can be read. */
function run(): ProjectionRun {
	return {
		asOf: "2026-10-31",
		engine: { package: "@trajectonomics/sim", version: "0.0.0" },
		scenario: BASE,
		overrides: [],
		removals: [],
		tax: "applied",
		notes: [],
		horizon: "2060-12-31",
		currency: "THB",
		runsOut: null,
		taxYears: [],
		tables: [
			{ name: "annual", count: 0, rows: [] },
			{
				name: "spendingRules",
				count: 2,
				rows: [
					{
						flow: "spend",
						date: "2050-06-01",
						portfolio: "21556406.02",
						amount: "862256.24",
						realAmount: "429426.52",
						paid: "862256.24",
						realPaid: "429426.52",
						withdrawalRate: "3.99",
						action: "none",
					},
					{
						flow: "spend",
						date: "2051-06-01",
						portfolio: "20186593.66",
						amount: "431128.12",
						realAmount: "214713.26",
						paid: "431128.12",
						realPaid: "214713.26",
						withdrawalRate: "4.39",
						action: "none",
					},
				],
			},
		],
	}
}

describe("withdrawalsFocusView", () => {
	test("states the first year's amount and its share, with a column per rule year", () => {
		const view = withdrawalsFocusView(withdrawalsView(run(), null), "both", false)
		expect(view?.label).toBe(
			"What could you spend in retirement? 862k THB from Jun 2050, 3.99% of your savings.",
		)
		expect(view?.amount).toBe("862256.24")
		expect(view?.first).toBe("Jun 2050")
		expect(view?.heights).toEqual([100, 50])
	})

	test("reads today's money when the page asks for it", () => {
		const view = withdrawalsFocusView(withdrawalsView(run(), null), "real", false)
		expect(view?.amount).toBe("429426.52")
		expect(view?.label).toContain("429k THB from Jun 2050")
		expect(view?.label).toContain("in today's money.")
	})

	test("says the amount is hidden with Hide amounts on", () => {
		const view = withdrawalsFocusView(withdrawalsView(run(), null), "both", true)
		expect(view?.label).toBe(
			"What could you spend in retirement? The amount is hidden from Jun 2050, 3.99% of your savings.",
		)
	})

	test("has no answer without a rule year", () => {
		expect(withdrawalsFocusView(withdrawalsView(null, null), "both", false)).toBeNull()
	})
})
