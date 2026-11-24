import { describe, expect, test } from "bun:test"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { useSessionHooks } from "../../client/what-if.test-support"
import { baselineRead } from "../../lib/view/plan-items/fixtures.test-support"
import { loanOf } from "../../lib/view/plan-items/loan-document"
import { loanDraftOf, loanFromDraft } from "../../lib/view/plan-items/loan-draft"
import { loanPlanDocument } from "../../lib/view/plan-items/loan-fixtures.test-support"
import { tryLoanInWhatIf } from "./loan-what-if"
import { assets, HASH } from "./plan-loans.test-support"

useSessionHooks()

describe("a loan card in a What-if session", () => {
	test("a tried principal shows the what-if's amount with the plan's struck through, as an Account card does", () => {
		const doc = loanPlanDocument()
		const stored = loanOf(doc, "loan")
		if (stored === undefined) throw new Error("no loan")
		const edited = loanFromDraft(
			{ ...loanDraftOf(stored), principal: "400000.00" },
			{ doc, existing: stored },
		)
		if (!edited.ok) throw new Error(JSON.stringify(edited.problems))
		expect(tryLoanInWhatIf("base", HASH, stored, edited.loan)).toEqual([])
		const body = assets()
		expect(body).toContain("400,000.00")
		expect(body).toMatch(/<s [^>]*>.*Baseline:.*500,000\.00/s)
		expect(body).toContain("The schedule and what the loan owes are the plan's own")
		expect(whatIfSession.changes.map((change) => change.label)).toEqual([
			"Loan loan tried as edited",
		])
	})

	test("a loan switched off is dimmed, says so, and offers one switch", () => {
		const doc = loanPlanDocument()
		const stored = loanOf(doc, "loan")
		if (stored === undefined) throw new Error("no loan")
		const spec = {
			kind: "loan",
			name: "loan",
			paths: ["accounts.loan", "flows.car-loan", "flows.car-draw"],
		} as const
		whatIfSession.setGroupOff("base", HASH, spec, spec.paths, true)
		const body = assets()
		expect(body).toContain("opacity-60")
		expect(body).toContain("Off in this what-if")
		expect(body.match(/Include loan in the what-if/g)?.length).toBe(1)
		expect(body).toContain("The schedule and what the loan owes are the plan's own")
	})

	test("a loan the Baseline holds has no switch, says why, and still offers Try", () => {
		const read = baselineRead()
		if (!read.ok) throw new Error("no baseline")
		const row = {
			account: { id: "loan", name: "loan" },
			kind: "liability",
			amount: "-5000.00",
		} as const
		const held = { ...read, data: { ...read.data, rows: [...read.data.rows, row] } }
		const body = assets({ baseline: held })
		expect(body).not.toContain("Include loan in the what-if")
		expect(body).toContain("Already owed: the ledger holds this debt")
		expect(body).toContain("Try a value")
	})
})
