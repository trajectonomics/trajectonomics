import { describe, expect, test } from "bun:test"
import { planDocument } from "./fixtures.test-support"
import { flowFromDraft } from "./flow-draft"
import { categoriesOf, flowCards, flowDraftOf } from "./flows"

const expense = (category: string) => ({
	...flowDraftOf(),
	name: "Groceries",
	amount: "4000.00",
	start: "2026-11-01",
	category,
})

describe("an expense's category", () => {
	test("a category is saved on an expense, trimmed", () => {
		const result = flowFromDraft(expense("  Food  "), { kind: "expense", taken: [] })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.flow.category).toBe("Food")
	})

	test("an empty category is not saved at all", () => {
		const result = flowFromDraft(expense("   "), { kind: "expense", taken: [] })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.flow).not.toHaveProperty("category")
	})

	test("a category of 65 characters is refused at the category field", () => {
		const result = flowFromDraft(expense("x".repeat(65)), { kind: "expense", taken: [] })
		expect(result.ok).toBe(false)
		if (!result.ok) expect(Object.keys(result.problems)).toEqual(["category"])
	})

	test("a category with a control character is refused at the category field", () => {
		const result = flowFromDraft(expense("Food\tand drink"), { kind: "expense", taken: [] })
		expect(result.ok).toBe(false)
		if (!result.ok) expect(Object.keys(result.problems)).toEqual(["category"])
	})

	test("an income Flow never carries a category", () => {
		const result = flowFromDraft(
			{
				...flowDraftOf(),
				name: "Pay",
				amount: "1.00",
				start: "2026-11-01",
				category: "Food",
				earned: true,
			},
			{ kind: "income", taken: [] },
		)
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.flow).not.toHaveProperty("category")
	})

	test("the categories the plan uses are suggested once each, and each card shows its own", () => {
		const doc = planDocument()
		const food = {
			kind: "expense" as const,
			frequency: "monthly" as const,
			start: "2026-11-01",
			amount: "1.00",
		}
		const flows = [
			...doc.flows,
			{ ...food, id: "a", category: "Food" },
			{ ...food, id: "b", category: "Food" },
		]
		expect(categoriesOf(flows)).toEqual(["Food"])
		const cards = flowCards(flows, "expense")
		expect(cards.find((card) => card.id === "a")?.category).toBe("Food")
		expect(cards.find((card) => card.id === "b")?.category).toBe("Food")
		expect(cards.filter((card) => card.category !== null).map((card) => card.id)).toEqual([
			"a",
			"b",
		])
	})
})
