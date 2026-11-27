import { describe, expect, test } from "bun:test"
import { buildCatalogue } from "./catalogue"
import { planNames, withCashLines } from "./flow-fixtures.test-support"
import { resolveSeries } from "./resolve"
import { missingNames } from "./series-missing"
import { seriesNames } from "./series-names"
import type { ChartDef } from "./types"
import { chartView } from "./view"

/** The cash-flow series id of one line, as `resolve-flows.ts` keys it. */
function cashSeries(
	group: string,
	id: string | null,
	account: string | null,
	category: string | null,
): string {
	return `cash:${JSON.stringify([group, id, account, category])}`
}

/** The words each id on a missing list reads, in the order given. */
function namesOf(ids: readonly string[], accounts = new Map<string, string>()): string[] {
	const named = missingNames(ids, new Map(), accounts)
	return ids.map((id) => named.get(id) ?? "")
}

describe("removed series are told apart", () => {
	test("an expense gone and an income gone list two different lines", () => {
		const names = namesOf([
			cashSeries("expense", "gone", null, null),
			cashSeries("income", "gone", null, null),
		])
		expect(names).toEqual(["Expense: gone (no category)", "Income: gone (no category)"])
		expect(new Set(names).size).toBe(2)
	})

	test("contributions into two Accounts the ledger names old take numbers", () => {
		const ids = [
			cashSeries("contribution", "save", "a", null),
			cashSeries("contribution", "save", "b", null),
		]
		const [first = "", second = ""] = namesOf(
			ids,
			new Map([
				["a", "old"],
				["b", "old"],
			]),
		)
		expect(first).toBe("Saving: save into old")
		expect(second).toBe("Saving: save into old (2)")
		expect(`${first}\n${second}`).not.toContain("account:")
		expect(`${first}\n${second}`).not.toContain("cash:")
	})

	test("an expense rent beside a category line rent lists both", () => {
		const names = namesOf([
			cashSeries("expense", "rent", null, null),
			cashSeries("category", "rent", null, null),
		])
		expect(names).toEqual(["Expense: rent (no category)", "Spending on: rent"])
		expect(new Set(names).size).toBe(2)
	})

	test("a literal no category item and the line for none list both", () => {
		const names = namesOf([
			cashSeries("category", "no category", null, null),
			cashSeries("category", null, null, null),
		])
		expect(names).toEqual(['Spending on: "no category"', "Spending on: no category"])
		expect(new Set(names).size).toBe(2)
	})

	test("a twin suffix that only repeats the name is dropped for a number", () => {
		const ids = [
			cashSeries("contribution", "save", "a", null),
			cashSeries("contribution", "save", "b", null),
		]
		const names = namesOf(
			ids,
			new Map([
				["a", "cash"],
				["b", "cash"],
			]),
		)
		expect(names).toEqual(["Saving: save into cash", "Saving: save into cash (2)"])
	})
})

describe("numbers do not follow the input order", () => {
	test("two clash groups that share a raw name take the same numbers in either plan order", () => {
		const labelled = withCashLines([
			{ group: "contribution", id: "a", account: "x" },
			{ group: "contribution", id: "a", account: "y" },
		])
		const plain = withCashLines([
			{ group: "contribution", id: "save", account: "x" },
			{ group: "contribution", id: "save", account: "y" },
		])
		const names = planNames(
			[{ id: "a", displayLabel: "save" }],
			new Map([
				["x", "cash"],
				["y", "cash"],
			]),
		)
		const told = [
			[labelled, plain],
			[plain, labelled],
		].map((runs) => seriesNames(runs, null, names))
		const ids = [...(told[0]?.keys() ?? [])].sort()
		for (const named of told) {
			expect(ids.map((id) => named.get(id) ?? "")).toEqual(ids.map((id) => told[0]?.get(id) ?? ""))
			expect(new Set(ids.map((id) => named.get(id) ?? "")).size).toBe(ids.length)
		}
	})
})

describe("a missing name never repeats a listed or drawn name", () => {
	/** A plan whose Flow rent reads the label old beside the unlabelled Flow old, and the id rent left out. */
	function listedAndRemoved() {
		const run = withCashLines([
			{ group: "expense", id: "rent" },
			{ group: "expense", id: "old" },
		])
		const names = planNames([{ id: "rent", displayLabel: "old" }])
		const listed = buildCatalogue([run], run, names).flatMap((group) =>
			group.entries.map((entry) => entry.name),
		)
		return { run, names, listed }
	}

	test("the removed expense Flow old in category rent takes a number beside the listed rent", () => {
		const { listed } = listedAndRemoved()
		expect(listed).toContain("Expense: old (rent)")
		const removed = cashSeries("expense", "old", null, "rent")
		const missing = missingNames([removed], new Map(), new Map(), listed)
		expect(missing.get(removed)).toBe("Expense: old (rent) (2)")
	})

	test("a drawn rent keeps its name and the removed line takes a number", () => {
		const { run, names, listed } = listedAndRemoved()
		const drawn = cashSeries("expense", "rent", null, null)
		const removed = cashSeries("expense", "old", null, "rent")
		const available = new Map(resolveSeries(run, names).map((item) => [item.id, item]))
		const chart: ChartDef = { id: "rents", name: "Rents", kind: "line", series: [drawn, removed] }
		const view = chartView(chart, available, new Map(), "nominal")
		expect(view.series.map((line) => line.name)).toEqual(["Expense: old (rent)"])
		expect(view.missing.map((item) => item.name)).toEqual(["Expense: old (rent) (2)"])
		expect(
			new Set([...view.series.map((line) => line.name), ...view.missing.map((item) => item.name)])
				.size,
		).toBe(2)
		expect(listed).toContain("Expense: old (rent)")
	})
})
