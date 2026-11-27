import { describe, expect, test } from "bun:test"
import { itemNames } from "../item-names"
import { buildCatalogue, defaultNameIndex } from "./catalogue"
import { withAccountValues, withCashLines } from "./flow-fixtures.test-support"
import { resolveSeries } from "./resolve"
import { seriesNames, seriesWords } from "./series-names"
import type { ChartDef } from "./types"
import { chartView } from "./view"

const NO_NAMES = itemNames(new Map(), null)

/** The cash-flow series id of one line, as `resolve-flows.ts` keys it. */
function cashSeries(
	group: string,
	id: string | null,
	account: string | null,
	category: string | null,
): string {
	return `cash:${JSON.stringify([group, id, account, category])}`
}

/** The cash-flow series id of the expense Flow `rent` in a category, or in none. */
function rent(category: string | null): string {
	return cashSeries("expense", "rent", null, category)
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

describe("a series name is never a series key", () => {
	/** The picker's name for each id, by id. */
	function pickerNames(
		runs: ReturnType<typeof withCashLines>[],
		selected: ReturnType<typeof withCashLines>,
		names = NO_NAMES,
	): ReadonlyMap<string, string> {
		return new Map(
			buildCatalogue(runs, selected, names)
				.flatMap((group) => group.entries)
				.map((entry) => [entry.id, entry.name]),
		)
	}

	test("a real category named like none reads apart from none on every plan", () => {
		const real = withCashLines([{ group: "expense", id: "rent", category: "no category" }])
		const none = withCashLines([{ group: "expense", id: "rent" }])
		const selected = withCashLines([{ group: "expense", id: "food" }])
		const ids = [rent("no category"), rent(null)]
		const expected = ['Expense: rent (rent, "no category")', "Expense: rent (rent, no category)"]
		const runs = [real, none, selected]
		const listed = pickerNames(runs, selected)
		expect(ids.map((id) => listed.get(id) ?? "")).toEqual(expected)
		const defaults = defaultNameIndex(runs, NO_NAMES)
		expect(ids.map((id) => defaults.get(id) ?? "")).toEqual(expected)
		expect(ids.map((id) => defaultNameIndex([...runs].reverse(), NO_NAMES).get(id) ?? "")).toEqual(
			expected,
		)
		expect(expected.join("\n")).not.toContain("cash:")
		expect(expected.join("\n")).not.toContain("[")
	})

	test("two Accounts named cash under one Flow are told apart without a key", () => {
		const first = withCashLines([
			{ group: "contribution", id: "save", account: "a" },
			{ group: "withdrawal", id: "save", account: "a" },
		])
		const second = withCashLines([
			{ group: "contribution", id: "save", account: "b" },
			{ group: "withdrawal", id: "save", account: "b" },
		])
		const selected = withCashLines([{ group: "expense", id: "food" }])
		const accounts = itemNames(
			new Map([
				["a", "cash"],
				["b", "cash"],
			]),
			null,
		)
		const listed = pickerNames([first, second, selected], selected, accounts)
		const reversed = pickerNames([second, first, selected], selected, accounts)
		const words = [
			["contribution", "Saving: save into cash"],
			["withdrawal", "Withdrawal: save from cash"],
		] as const
		for (const [group, word] of words) {
			const a = listed.get(cashSeries(group, "save", "a", null)) ?? ""
			const b = listed.get(cashSeries(group, "save", "b", null)) ?? ""
			expect(a.startsWith(word)).toBe(true)
			expect(b.startsWith(word)).toBe(true)
			expect(a).not.toBe(b)
			expect(b.endsWith(" (2)")).toBe(true)
			expect(`${a}\n${b}`).not.toContain("cash:")
			expect(`${a}\n${b}`).not.toContain("account:")
			expect(reversed.get(cashSeries(group, "save", "a", null))).toBe(a)
			expect(reversed.get(cashSeries(group, "save", "b", null))).toBe(b)
		}
	})

	test("a tie no step tells apart takes numbers in sorted-id order", () => {
		const one = withCashLines([
			{ group: "contribution", id: "save", account: "a" },
			{ group: "contribution", id: "save", account: "c" },
		])
		const two = withCashLines([{ group: "contribution", id: "save", account: "b" }])
		const selected = withCashLines([{ group: "expense", id: "food" }])
		const accounts = itemNames(
			new Map([
				["a", "cash"],
				["b", "cash"],
				["c", "cash"],
			]),
			null,
		)
		const named = seriesNames([one, two, selected], selected, accounts)
		const names = ["a", "b", "c"].map(
			(account) => named.get(cashSeries("contribution", "save", account, null)) ?? "",
		)
		expect(new Set(names).size).toBe(3)
		expect(names[0]?.endsWith(" (2)")).toBe(false)
		expect(names[1]?.endsWith(" (2)")).toBe(true)
		expect(names[2]?.endsWith(" (3)")).toBe(true)
		expect(names.join("\n")).not.toContain("cash:")
	})

	test("a saved chart naming a removed Flow lists it in words, not its key", () => {
		const selected = withCashLines([{ group: "expense", id: "food" }])
		const gone = cashSeries("expense", "gone", null, null)
		const chart: ChartDef = { id: "gone", name: "Gone", kind: "line", series: [gone] }
		const view = chartView(
			chart,
			byId(selected),
			seriesNames([selected], selected, NO_NAMES),
			"nominal",
		)
		expect(view.missing.map((item) => item.name)).toEqual(["gone (no category)"])
		expect(seriesWords(gone)).toBe("gone (no category)")
	})
})
