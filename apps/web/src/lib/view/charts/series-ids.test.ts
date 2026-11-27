import { describe, expect, test } from "bun:test"
import { savedName } from "./edit"
import { seriesCategory, seriesLabelId, seriesWords } from "./series-ids"

/** The cash-flow series id of one line, as `resolve-flows.ts` keys it. */
function cash(group: string, id: string | null, account: string | null, category: string | null) {
	return `cash:${JSON.stringify([group, id, account, category])}`
}

describe("words from a series id", () => {
	test("a cash id that is not a list, as a hand-edited chart file may hold, reads words and never throws", () => {
		for (const id of ["cash:5", "cash:{}", 'cash:"rent"', "cash:not json"]) {
			expect(seriesLabelId(id)).toBe("no category")
			expect(seriesCategory(id)).toBeNull()
			expect(seriesWords(id)).toBe("no category")
		}
	})

	test("a new chart naming a removed series is saved under words, never its key", () => {
		const gone = JSON.stringify(["expense", "gone", null, null])
		const name = savedName("", [`cash:${gone}`], new Map())
		expect(name).toContain("gone")
		expect(name).not.toContain("cash:")
		expect(name).not.toContain("[")
	})

	test("a removed cash series reads its group, item, category and Account", () => {
		const accounts = new Map([["a", "cash"]])
		expect(seriesWords(cash("expense", "gone", null, null), accounts)).toBe(
			"Expense: gone (no category)",
		)
		expect(seriesWords(cash("income", "gone", null, null), accounts)).toBe(
			"Income: gone (no category)",
		)
		expect(seriesWords(cash("contribution", "save", "a", null), accounts)).toBe(
			"Saving: save into cash",
		)
		expect(seriesWords(cash("withdrawal", "save", "a", null), accounts)).toBe(
			"Withdrawal: save from cash",
		)
	})

	test("only an income or expense line states a category, so the others carry no (no category)", () => {
		expect(seriesWords(cash("category", "Food", null, null))).toBe("Spending on: Food")
		expect(seriesWords(cash("category", null, null, null))).toBe("Spending on: no category")
		expect(seriesWords(cash("contribution", "save", "a", "Home"))).toBe("Saving: save into a")
		expect(seriesWords(cash("withdrawal", "save", "a", "Home"))).toBe("Withdrawal: save from a")
	})

	test("a literal no category item is quoted, beside the words for none", () => {
		expect(seriesWords(cash("category", "no category", null, null))).toBe(
			'Spending on: "no category"',
		)
		expect(seriesWords(cash("expense", "no category", null, "no category"))).toBe(
			'Expense: "no category" ("no category")',
		)
	})

	test("a removed tax or rule series reads words built from its parts, never its key", () => {
		expect(seriesWords("tax:th-pit:due")).toBe("Tax due, th-pit")
		expect(seriesWords("tax:th-pit:taxable")).toBe("Taxable income, th-pit")
		expect(seriesWords("rule:fund")).toBe("Paid by the spending rule fund")
		for (const id of ["tax:th-pit:due", "tax:th-pit:taxable", "rule:fund"]) {
			expect(seriesWords(id)).not.toContain("tax:")
			expect(seriesWords(id)).not.toContain("rule:")
		}
	})

	test("an odd tax id splits at its last colon and still reads words, never its key", () => {
		expect(seriesWords("tax:a:b:due")).toBe("Tax due, a:b")
		expect(seriesWords("tax:a:b:taxable")).toBe("Taxable income, a:b")
		expect(seriesWords("tax:th-pit")).toBe("Tax, th-pit")
		for (const id of ["tax:a:b:due", "tax:th-pit"]) {
			expect(seriesWords(id)).not.toContain("tax:")
		}
	})

	test("a removed Account reads Value of its ledger name, else its id, never account:", () => {
		expect(seriesWords("account:savings", new Map([["savings", "Savings"]]))).toBe(
			"Value of Savings",
		)
		expect(seriesWords("account:01a21b51")).toBe("Value of 01a21b51")
		expect(seriesWords("account:savings")).not.toContain("account:")
	})
})
