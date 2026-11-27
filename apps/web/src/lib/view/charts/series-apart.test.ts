import { describe, expect, test } from "bun:test"
import { itemNames } from "../item-names"
import { withCashLines } from "./flow-fixtures.test-support"
import { seriesNames } from "./series-names"

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

/** What each plan's expense Flow `id` reads, one plan per category, told apart across the plans. */
function namesOf(id: string, categories: readonly string[]): string[] {
	const runs = categories.map((category) => withCashLines([{ group: "expense", id, category }]))
	const named = seriesNames(runs, null, NO_NAMES)
	return categories.map((category) => named.get(cashSeries("expense", id, null, category)) ?? "")
}

describe("a twin step is skipped only when it adds nothing and leaves the lines alike", () => {
	test("categories that only repeat the Flow's own words still tell its lines apart", () => {
		expect(namesOf("home-loan", ["home", "loan"])).toEqual([
			"Expense: home-loan (home-loan, home)",
			"Expense: home-loan (home-loan, loan)",
		])
	})

	test("two categories that differ only in case stay apart", () => {
		expect(namesOf("food", ["Food", "food"])).toEqual([
			"Expense: food (food, Food)",
			"Expense: food (food, food)",
		])
	})

	test("categories with no letter or digit still stay apart", () => {
		expect(namesOf("food", ["🍔", "🍜"])).toEqual([
			"Expense: food (food, 🍔)",
			"Expense: food (food, 🍜)",
		])
	})
})

describe("Thai is read as whole words", () => {
	test("categories that differ only in a combining mark tell a Flow's lines apart", () => {
		const categories = ["กิน", "กัน", "ก้น"]
		const runs = categories.map((category) =>
			withCashLines([{ group: "expense", id: "กิน", category }]),
		)
		const named = seriesNames(runs, null, NO_NAMES)
		const nameOf = (category: string) =>
			named.get(cashSeries("expense", "กิน", null, category)) ?? ""
		expect(nameOf("กัน")).toBe("Expense: กิน (กิน, กัน)")
		expect(nameOf("ก้น")).toBe("Expense: กิน (กิน, ก้น)")
	})
})

describe("a kept series' category counts when a step is judged", () => {
	test("the line left beside the selected plan's still states its category", () => {
		const categories = ["home", "loan"]
		const runs = categories.map((category) =>
			withCashLines([{ group: "expense", id: "home-loan", category }]),
		)
		const named = seriesNames(runs, runs[0] ?? null, NO_NAMES)
		expect(named.get(cashSeries("expense", "home-loan", null, "loan"))).toBe(
			"Expense: home-loan (home-loan, loan)",
		)
	})
})
