import { describe, expect, test } from "bun:test"
import { itemNames } from "../item-names"
import { buildCatalogue, defaultNameIndex } from "./catalogue"
import { withAccountValues, withCashLines } from "./flow-fixtures.test-support"
import { resolveSeries } from "./resolve"
import { seriesNames } from "./series-names"
import type { ChartDef } from "./types"
import { chartView } from "./view"

const NO_NAMES = itemNames(new Map(), null)

/** The cash-flow series id of the expense Flow `rent` in a category, or in none. */
function rent(category: string | null): string {
	return `cash:${JSON.stringify(["expense", "rent", null, category])}`
}

function byId(run: ReturnType<typeof withCashLines>) {
	return new Map(resolveSeries(run, NO_NAMES).map((item) => [item.id, item]))
}

describe("one id reads one name", () => {
	test("three plans that name a Flow alike list two choices and two missing lines", () => {
		const home = withCashLines([{ group: "expense", id: "rent", category: "Home" }])
		const none = withCashLines([{ group: "expense", id: "rent" }])
		const selected = withCashLines([{ group: "expense", id: "food" }])
		const runs = [home, none, selected]
		const expected = ["Expense: rent (rent, Home)", "Expense: rent (rent, no category)"]
		const listed = buildCatalogue(runs, selected, NO_NAMES).flatMap((group) =>
			group.entries.map((entry) => entry.name),
		)
		expect(listed).toEqual(expect.arrayContaining(expected))
		expect(new Set(listed).size).toBe(listed.length)
		const chart: ChartDef = {
			id: "rents",
			name: "Rents",
			kind: "line",
			series: [rent("Home"), rent(null)],
		}
		const view = chartView(chart, byId(selected), seriesNames(runs, selected, NO_NAMES), "nominal")
		expect(view.missing.map((item) => item.name)).toEqual(expected)
	})

	test("a drawn series keeps its chart name while another plan's rent is told apart", () => {
		const home = withCashLines([{ group: "expense", id: "rent", category: "Home" }])
		const none = withCashLines([{ group: "expense", id: "rent" }])
		const named = seriesNames([home, none], home, NO_NAMES)
		expect(named.get(rent("Home"))).toBe("Expense: rent")
		expect(named.get(rent(null))).toBe("Expense: rent (rent)")
		const chart: ChartDef = { id: "rent", name: "Rent", kind: "line", series: [rent(null)] }
		const view = chartView(chart, byId(home), named, "nominal")
		expect(view.missing).toEqual([
			{
				id: rent(null),
				name: "Expense: rent (rent)",
				reason: "this plan has no such cash-flow line",
			},
		])
	})

	test("an uncategorised line beside a category named Uncategorised keeps both names", () => {
		const both = withCashLines([
			{ group: "category", id: "Uncategorised" },
			{ group: "category", id: null },
		])
		const one = withCashLines([{ group: "category", id: null }])
		const category = (id: string | null) => `cash:${JSON.stringify(["category", id, null, null])}`
		const named = seriesNames([both], both, NO_NAMES)
		expect(named.get(category("Uncategorised"))).toBe("Spending on: Uncategorised (Uncategorised)")
		expect(named.get(category(null))).toBe("Spending on: Uncategorised (no category)")
		for (const runs of [
			[both, one],
			[one, both],
		]) {
			expect(defaultNameIndex(runs, NO_NAMES).get(category(null))).toBe(
				"Spending on: Uncategorised (no category)",
			)
		}
	})

	test("two Account ids the ledger names alike read Value of Savings with their ids", () => {
		const run = withAccountValues(["a", "b"])
		const names = itemNames(
			new Map([
				["a", "Savings"],
				["b", "Savings"],
			]),
			null,
		)
		const listed = buildCatalogue([run], run, names).flatMap((group) =>
			group.entries.map((entry) => entry.name),
		)
		expect(listed).toEqual(expect.arrayContaining(["Value of Savings (a)", "Value of Savings (b)"]))
		expect(listed.join("\n")).not.toContain("account:")
	})
})
