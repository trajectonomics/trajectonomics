import { describe, expect, test } from "bun:test"
import { scenarioDocument } from "../../contract"
import { loanOf } from "./loan-document"
import { loanDraftOf, loanFromDraft } from "./loan-draft"
import { loanPlanDocument } from "./loan-fixtures.test-support"

/** The fixture plan with the loan's compounding and rounding replaced, as a newer CLI could state them. */
function withWords(compounding: string, rounding: string) {
	const plan = loanPlanDocument()
	return scenarioDocument.parse({
		...plan,
		accounts: plan.accounts.map((account) =>
			account.id === "loan" ? { ...account, compounding } : account,
		),
		flows: plan.flows.map((flow) =>
			flow.level === undefined ? flow : { ...flow, level: { ...flow.level, rounding } },
		),
	})
}

describe("a word the form does not offer", () => {
	test("a stored compounding and rounding the form does not list are kept when it is saved untouched", () => {
		const doc = withWords("fortnightly", "banker")
		const existing = loanOf(doc, "loan")
		if (existing === undefined) throw new Error("the fixture has no loan")
		const draft = loanDraftOf(existing)
		expect(draft).toMatchObject({ compounding: "fortnightly", rounding: "banker" })
		expect(loanFromDraft(draft, { existing, doc }).ok).toBe(true)
	})

	test("a word typed that is not the stored one is still refused", () => {
		const doc = withWords("fortnightly", "banker")
		const existing = loanOf(doc, "loan")
		if (existing === undefined) throw new Error("the fixture has no loan")
		const result = loanFromDraft(
			{ ...loanDraftOf(existing), compounding: "weekly" },
			{ existing, doc },
		)
		expect(result.ok).toBe(false)
		if (!result.ok) expect(Object.keys(result.problems)).toEqual(["compounding"])
	})
})
