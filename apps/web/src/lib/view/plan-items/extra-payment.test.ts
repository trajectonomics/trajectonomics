import { describe, expect, test } from "bun:test"
import { extraDraftOf, extraFromDraft, extraPaymentId } from "./extra-payment"
import { planDocument } from "./fixtures.test-support"
import { loanPlanDocument } from "./loan-fixtures.test-support"

describe("paying a loan extra", () => {
	test("a payment once is a Contribution into the loan, with a fixed amount and no end", () => {
		const result = extraFromDraft(
			{ ...extraDraftOf(), amount: "10000.00", start: "2028-01-01" },
			{ loanId: "loan", doc: loanPlanDocument() },
		)
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.flow).toEqual({
			id: "loan-extra-1",
			kind: "contribution",
			target: "loan",
			frequency: "once",
			start: "2028-01-01",
			amount: "10000.00",
			growth: { bps: 0 },
		})
	})

	test("a monthly payment states its last date", () => {
		const result = extraFromDraft(
			{ amount: "2000.00", mode: "monthly", start: "2028-01-01", end: "2028-12-01" },
			{ loanId: "loan", doc: loanPlanDocument() },
		)
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.flow).toMatchObject({ frequency: "monthly", end: "2028-12-01" })
	})

	test("a monthly payment with no last date is refused at the end field", () => {
		const result = extraFromDraft(
			{ amount: "2000.00", mode: "monthly", start: "2028-01-01", end: "" },
			{ loanId: "loan", doc: loanPlanDocument() },
		)
		expect(result.ok).toBe(false)
		if (!result.ok) expect(Object.keys(result.problems)).toEqual(["end"])
	})

	test("an amount that is not a decimal is refused at the amount field", () => {
		const result = extraFromDraft(
			{ ...extraDraftOf(), amount: "10,000,00", start: "2028-01-01" },
			{ loanId: "loan", doc: loanPlanDocument() },
		)
		expect(result.ok).toBe(false)
		if (!result.ok) expect(Object.keys(result.problems)).toEqual(["amount"])
	})

	test("the id is the first extra of the loan that no Flow holds", () => {
		expect(extraPaymentId("loan", ["loan-extra-1", "loan-extra-2"])).toBe("loan-extra-3")
		expect(extraPaymentId("loan", [])).toBe("loan-extra-1")
	})

	test("the form does not check that the target is a loan: traj refuses it when the plan is saved", () => {
		const result = extraFromDraft(
			{ ...extraDraftOf(), amount: "10.00", start: "2028-01-01" },
			{ loanId: "bank", doc: planDocument() },
		)
		expect(result.ok).toBe(true)
	})
})
