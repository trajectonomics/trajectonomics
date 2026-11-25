import { describe, expect, test } from "bun:test"
import { scenarioFlow } from "../../contract/scenario-show"
import { planDocument } from "./fixtures.test-support"
import { flowCards } from "./flows"
import { loanPlanDocument } from "./loan-fixtures.test-support"
import { isLoan, loanCards } from "./loans"

describe("loanCards", () => {
	test("lists the withdrawal and the level loan of a plan, and no other Flow", () => {
		const cards = loanCards(loanPlanDocument().flows)
		expect(cards.map((card) => card.id)).toEqual(["car-draw", "car-loan"])
		expect(planDocument().flows.filter(isLoan)).toEqual([])
	})

	test("a withdrawal leads with its amount per occurrence and names what it borrows from", () => {
		const draw = loanCards(loanPlanDocument().flows).find((card) => card.id === "car-draw")
		expect(draw?.title).toBe("Withdrawal")
		expect(draw?.amount).toBe("500000.00")
		expect(draw?.rows).toContainEqual({ label: "Borrows from", value: "loan", account: true })
		expect(draw?.rows).toContainEqual({ label: "Growth", value: "0.00% a year" })
	})

	test("a level loan leads with its principal, and states its payments, not an amount", () => {
		const loan = loanCards(loanPlanDocument().flows).find((card) => card.id === "car-loan")
		expect(loan?.title).toBe("Level loan")
		expect(loan?.amountLabel).toBe("Principal")
		expect(loan?.amount).toBe("500000.00")
		expect(loan?.rows).toContainEqual({ label: "Repays", value: "loan", account: true })
		expect(loan?.rows).toContainEqual({ label: "Payments", value: "60 equal payments" })
	})

	test("a withdrawal priced by a derived amount has no amount to show", () => {
		const derived = scenarioFlow.parse({
			id: "draw",
			kind: "withdrawal",
			frequency: "once",
			start: "2027-01-01",
			source: "loan",
			derive: { measures: [], result: "x" },
		})
		const card = loanCards([derived])[0]
		expect(card?.amount).toBeNull()
		expect(card?.rows).toContainEqual({ label: "Growth", value: "Computed" })
	})
})

describe("the planner's income and expense cards", () => {
	test("a computed Flow with a level is not editable, so the form never opens empty", () => {
		const flow = scenarioFlow.parse({
			id: "odd",
			kind: "income",
			frequency: "monthly",
			start: "2027-01-01",
			earned: true,
			level: { principal: "1.00", payments: 2, rounding: "floor" },
		})
		const card = flowCards([flow], "income")[0]
		expect(card?.amount).toBeNull()
		expect(card?.growth).toBe("Computed")
		expect(card?.editable).toBe(false)
	})
})
