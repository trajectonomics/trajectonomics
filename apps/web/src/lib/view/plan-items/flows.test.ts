import { describe, expect, test } from "bun:test"
import type { ScenarioFlow } from "../../contract/scenario-show"
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
			startAnchor: null,
			endAnchor: null,
			growth: "Follows inflation",
			earned: "Earned",
			category: null,
			employer: null,
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

describe("flowCards with a Milestone date", () => {
	test("a Flow that starts at a Milestone reads when it fires, not the As-of the form wrote as its start", () => {
		const rule = {
			id: "retirement-spending",
			kind: "expense",
			frequency: "monthly",
			start: "2026-10-31",
			startAt: "retire",
		}
		const [card] = flowCards([rule as ScenarioFlow], "expense")
		expect(card?.start).toBe("When retire fires")
		expect(card?.end).toBe("To the horizon")
	})

	test("an expense stopped at a Milestone reads when it fires, not 'To the horizon'", () => {
		const rent = {
			id: "rent",
			kind: "expense",
			frequency: "monthly",
			start: "2026-10-31",
			amount: "900.00",
			endAt: "retire",
		}
		const [card] = flowCards([rent as ScenarioFlow], "expense")
		expect(card?.start).toBe("2026-10-31")
		expect(card?.end).toBe("When retire fires")
	})
})

describe("flowCards with a household", () => {
	test("labels a pinned date with the person it is pinned to, and leaves the others bare", () => {
		const household = {
			schemaVersion: 1 as const,
			people: [{ id: "me", role: "holder" as const, born: "1990-06", lifeExpectancy: 90 }],
			anchors: [{ path: "flows.salary.end", person: "me", age: 60 }],
		}
		const cards = flowCards(planDocument().flows, "income", household)
		expect(cards[0]).toMatchObject({ startAnchor: null, endAnchor: "at you, age 60" })
		expect(cards[1]).toMatchObject({ startAnchor: null, endAnchor: null })
	})
})

describe("flowDraftOf", () => {
	test("starts a new Flow monthly, following inflation and earned", () => {
		expect(flowDraftOf()).toEqual({
			category: "",
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
