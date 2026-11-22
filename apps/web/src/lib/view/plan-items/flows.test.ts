import { describe, expect, test } from "bun:test"
import { planDocument } from "./fixtures.test-support"
import { flowCards, flowDraftOf } from "./flows"

describe("flowCards", () => {
	test("lists the income Flows as cards, each with its amount, growth and whether it is earned", () => {
		const cards = flowCards(planDocument().flows, "income")
		expect(cards.map((card) => card.id)).toEqual(["salary", "pension", "tax-refund"])
		expect(cards[0]).toEqual({
			id: "salary",
			amount: "90000.00",
			frequency: "monthly",
			start: "2026-11-01",
			end: "2050-05-14",
			growth: "Follows inflation",
			earned: "Earned",
			editable: true,
		})
		expect(cards[1]?.earned).toBe("Passive")
		expect(cards[1]?.growth).toBe("0.00% a year")
		expect(cards[1]?.end).toBe("To the horizon")
	})

	test("lists the expenses without an income marker, with a fixed percent a year", () => {
		const cards = flowCards(planDocument().flows, "expense")
		expect(cards).toHaveLength(1)
		expect(cards[0]?.growth).toBe("3.00% a year")
		expect(cards[0]?.earned).toBeNull()
	})

	test("a computed Flow reads computed, and is not editable here", () => {
		const refund = flowCards(planDocument().flows, "income").find(
			(card) => card.id === "tax-refund",
		)
		expect(refund?.amount).toBeNull()
		expect(refund?.growth).toBe("Computed")
		expect(refund?.editable).toBe(false)
	})
})

describe("flowDraftOf", () => {
	test("starts a new Flow monthly, following inflation and earned", () => {
		expect(flowDraftOf()).toEqual({
			name: "",
			frequency: "monthly",
			start: "",
			end: "",
			amount: "",
			growth: "inflation",
			rate: "",
			earned: true,
		})
	})

	test("shows an existing Flow's rate as a percent, moved from its basis points", () => {
		const rent = planDocument().flows.find((flow) => flow.id === "rent")
		expect(flowDraftOf(rent)).toMatchObject({ growth: "fixed", rate: "3.00", amount: "14000.00" })
	})
})
