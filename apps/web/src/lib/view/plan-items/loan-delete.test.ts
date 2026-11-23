import { describe, expect, test } from "bun:test"
import { scenarioFlow } from "../../contract"
import { withFlow } from "./document"
import { planDocument } from "./fixtures.test-support"
import { withoutLoan } from "./loan-document"
import { loanPlanDocument } from "./loan-fixtures.test-support"

describe("deleting a loan", () => {
	test("deleting a loan the Baseline does not hold removes its Account and every Flow that pays it or borrows from it", () => {
		const removal = withoutLoan(loanPlanDocument(), "loan", false)
		if (!removal.ok) throw new Error(removal.message)
		expect(removal.document.accounts.map((account) => account.id)).toEqual(["bank"])
		expect(removal.document.flows.map((flow) => flow.id)).toEqual(
			planDocument().flows.map((flow) => flow.id),
		)
	})

	test("deleting a loan the Baseline holds removes its Flows and keeps the Account declared", () => {
		const doc = loanPlanDocument()
		const extra = scenarioFlow.parse({
			id: "loan-extra-1",
			kind: "contribution",
			frequency: "once",
			start: "2028-01-01",
			amount: "1000.00",
			target: "loan",
		})
		const removal = withoutLoan(withFlow(doc, extra), "loan", true)
		if (!removal.ok) throw new Error(removal.message)
		expect(removal.document.accounts.map((account) => account.id)).toEqual(["bank", "loan"])
		expect(removal.document.flows.map((flow) => flow.id)).toEqual(
			planDocument().flows.map((flow) => flow.id),
		)
	})

	test("a Flow whose derive reads the loan refuses the delete by name, when the Account would go", () => {
		const reader = scenarioFlow.parse({
			id: "tax-on-loan",
			kind: "expense",
			frequency: "monthly",
			start: "2027-01-01",
			derive: {
				measures: [{ id: "owed", op: "account", account: "loan" }],
				result: "owed",
			},
		})
		const doc = withFlow(loanPlanDocument(), reader)
		const refused = withoutLoan(doc, "loan", false)
		expect(refused.ok).toBe(false)
		if (!refused.ok) expect(refused.message).toContain("tax-on-loan")
		// The Account stays when the Baseline holds it, so the Flow still reads a declared Account.
		expect(withoutLoan(doc, "loan", true).ok).toBe(true)
	})
})
