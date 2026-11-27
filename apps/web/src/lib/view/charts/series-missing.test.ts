import { describe, expect, test } from "bun:test"
import { planNames, withCashLines } from "./flow-fixtures.test-support"
import { missingNames } from "./series-missing"
import { seriesNames } from "./series-names"

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
		expect(first.startsWith("Saving: save (no category) into old")).toBe(true)
		expect(second.startsWith("Saving: save (no category) into old")).toBe(true)
		expect(first).not.toBe(second)
		expect(second.endsWith(" (2)")).toBe(true)
		expect(`${first}\n${second}`).not.toContain("account:")
		expect(`${first}\n${second}`).not.toContain("cash:")
	})

	test("an expense rent beside a category line rent lists both", () => {
		const names = namesOf([
			cashSeries("expense", "rent", null, null),
			cashSeries("category", "rent", null, null),
		])
		expect(names).toEqual(["Expense: rent (no category)", "Spending on: rent (no category)"])
		expect(new Set(names).size).toBe(2)
	})

	test("a literal no category item and the line for none list both", () => {
		const names = namesOf([
			cashSeries("category", "no category", null, null),
			cashSeries("category", null, null, null),
		])
		expect(names).toEqual([
			'Spending on: "no category" (no category)',
			"Spending on: no category (no category)",
		])
		expect(new Set(names).size).toBe(2)
	})

	test("a numbered entry takes the keeper's twin form", () => {
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
		expect(names[0]?.endsWith("(save, no category, cash)")).toBe(true)
		expect(names[1]?.endsWith("(save, no category, cash) (2)")).toBe(true)
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
