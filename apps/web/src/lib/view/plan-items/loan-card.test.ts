import { describe, expect, test } from "bun:test"
import { scenarioDocument } from "../../contract"
import { loanCardsOf } from "./loan-card"
import { loanPlanDocument } from "./loan-fixtures.test-support"

/** The plan's loan with the words the CLI states replaced by others, as a newer CLI could state them. */
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

const rowsOf = (compounding: string, rounding: string) =>
	loanCardsOf(withWords(compounding, rounding), undefined)[0]?.rows ?? []

describe("a loan card's terms", () => {
	test("word a rounding the page knows", () => {
		expect(rowsOf("monthly", "ceil")).toContainEqual({ label: "Rounding", value: "Rounded up" })
	})

	test("show a rounding or a compounding the page does not know as the CLI states it", () => {
		const rows = rowsOf("fortnightly", "banker")
		expect(rows).toContainEqual({ label: "Rounding", value: "banker" })
		expect(rows.find((row) => row.label === "Rate")?.value).toContain("fortnightly interest")
	})
})
