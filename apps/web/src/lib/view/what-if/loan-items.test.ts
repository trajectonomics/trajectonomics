import { describe, expect, test } from "bun:test"
import { scenarioFlow } from "../../contract/scenario-show"
import { baselineRead } from "../plan-items/fixtures.test-support"
import { loanPlanDocument } from "../plan-items/loan-fixtures.test-support"
import { loanCards } from "../plan-items/loans"
import { loanItems, rowMarksOf } from "./loan-items"

const doc = loanPlanDocument()
const context = { run: undefined, baseline: baselineRead() }

describe("the loan cards of a what-if", () => {
	test("with no session the cards are the plan's and nothing is marked", () => {
		const view = loanItems(doc, context, null)
		expect(view.cards.map((card) => card.id)).toEqual(["loan"])
		expect(view.marks).toEqual({})
	})

	test("a tried rate and principal show the what-if's terms with the baseline's text beside them", () => {
		const view = loanItems(doc, context, {
			sets: [
				{
					path: "flows.car-loan.level",
					value: { principal: "400000.00", payments: 48, rounding: "halfUp" },
				},
				{ path: "accounts.loan.rate", value: 700 },
			],
			removals: [],
		})
		const [card] = view.cards
		expect(card?.principal).toBe("400000.00")
		expect(card?.rows.find((row) => row.label === "Rate")?.value).toBe(
			"7.00% a year, monthly interest",
		)
		expect(card?.rows.find((row) => row.label === "Payments")?.value).toBe(
			"48 equal monthly payments",
		)
		const marks = view.marks["loan"]
		expect(marks?.principal).toBe("500000.00")
		expect(marks?.rows["Payments"]).toBe("60 equal monthly payments")
		expect(marks?.rows["Rate"]).toContain("5.00% a year")
		expect(marks?.rows["First payment"]).toBeUndefined()
		expect(marks?.off).toBe(false)
	})

	test("a withdrawal's date row is marked across the On and Starts labels a frequency change gives it", () => {
		const draw = (frequency: "once" | "monthly", start: string) =>
			scenarioFlow.parse({
				id: "draw",
				kind: "withdrawal",
				frequency,
				start,
				amount: "500.00",
				source: "loan",
			})
		const monthly = loanCards([draw("monthly", "2027-01-01")])[0]
		const once = loanCards([draw("once", "2027-02-01")])[0]
		expect(once?.rows.find((row) => row.key === "start")?.label).toBe("On")
		expect(monthly?.rows.find((row) => row.key === "start")?.label).toBe("Starts")
		expect(rowMarksOf(monthly?.rows ?? [], once?.rows ?? [])).toContainEqual([
			"start",
			"2027-01-01",
		])
		expect(rowMarksOf(once?.rows ?? [], monthly?.rows ?? [])).toContainEqual([
			"start",
			"2027-02-01",
		])
	})

	test("a loan switched off keeps its stored card, and is marked off with nothing struck through", () => {
		const view = loanItems(doc, context, {
			sets: [],
			removals: ["accounts.loan", "flows.car-loan", "flows.car-draw"],
		})
		expect(view.cards.map((card) => card.id)).toEqual(["loan"])
		expect(view.cards[0]?.principal).toBe("500000.00")
		expect(view.marks["loan"]).toEqual({ off: true, principal: undefined, rows: {} })
	})
})
