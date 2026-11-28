import { describe, expect, test } from "bun:test"
import type { ProjectionRun } from "../../contract"
import { BASE } from "../compare/fixtures.test-support"
import { withdrawalsFocusView } from "./focus"
import { withdrawalsView } from "./view"

/** A projection with two spending-rule years, so the columns and the first tick can be read. */
function run(rate = "3.99"): ProjectionRun {
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
						withdrawalRate: rate,
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

/** The same run with a second rule Flow, so the page has more than one rule. */
function twoRules(): ProjectionRun {
	const first = run()
	const table = first.tables[1]
	if (table?.name !== "spendingRules") throw new Error("the fixture has its spending rule")
	return {
		...first,
		tables: [
			first.tables[0]!,
			{ ...table, count: 3, rows: [...table.rows, { ...table.rows[0]!, flow: "spend-2" }] },
		],
	}
}

describe("withdrawalsFocusView", () => {
	test("states the first year's amount and its share, with a column per rule year", () => {
		const view = withdrawalsFocusView(withdrawalsView(run(), null), "both", false)
		expect(view?.label).toBe(
			"What could you spend in retirement? 862k THB. From Jun 2050, 3.99% of your savings.",
		)
		expect(view?.amount).toBe("862256.24")
		expect(view?.first).toBe("Jun 2050")
		expect(view?.share).toBe("3.99%")
		expect(view?.heights).toEqual([100, 50])
	})

	test("reads today's money when the page asks for it", () => {
		const view = withdrawalsFocusView(withdrawalsView(run(), null), "real", false)
		expect(view?.amount).toBe("429426.52")
		expect(view?.label).toContain("429k THB.")
		expect(view?.label).toContain("in today's money.")
	})

	test("trims the share's trailing zeros, as every percent on the page is read", () => {
		const view = withdrawalsFocusView(withdrawalsView(run("4.00"), null), "both", false)
		expect(view?.share).toBe("4%")
		expect(view?.label).toContain(", 4% of your savings.")
	})

	test("says the amount is hidden with Hide amounts on, ending the first sentence at hidden", () => {
		const view = withdrawalsFocusView(withdrawalsView(run(), null), "both", true)
		expect(view?.label).toBe(
			"What could you spend in retirement? The amount is hidden. From Jun 2050, 3.99% of your savings.",
		)
	})

	test("says first rule when the plan has several", () => {
		const view = withdrawalsFocusView(withdrawalsView(twoRules(), null), "both", true)
		expect(view?.label).toContain("The first rule's amount is hidden.")
		expect(view?.label).not.toContain("The amount is hidden.")
	})

	test("has no answer without a rule year", () => {
		expect(withdrawalsFocusView(withdrawalsView(null, null), "both", false)).toBeNull()
	})
})
