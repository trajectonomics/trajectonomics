import { describe, expect, test } from "bun:test"
import type { Baseline, Read } from "../../contract"
import { baselineRead, planDocument } from "./fixtures.test-support"
import { loanDocument } from "./loan-document"
import { type LoanDraft, loanFromDraft } from "./loan-draft"
import { loanPlanDocument } from "./loan-fixtures.test-support"
import { owedChoicesOf, owedUnavailable } from "./loan-owed"

/** The Baseline of a ledger that owes a car loan, and a card the plan does not declare. */
function owingBaseline(): Read<Baseline> {
	const base = baselineRead()
	if (!base.ok) throw new Error("the fixture is not ok")
	return {
		...base,
		data: {
			...base.data,
			rows: [
				...base.data.rows,
				{ account: { id: "loan", name: "Car Loan" }, kind: "liability", amount: "184000.00" },
				{ account: { id: "01-card", name: "Card" }, kind: "liability", amount: "9000.00" },
			],
		},
	}
}

function owedDraft(overrides: Partial<LoanDraft> = {}): LoanDraft {
	return {
		name: "",
		principal: "184000.00",
		rate: "5",
		compounding: "monthly",
		payments: "23",
		firstPayment: "2026-11-01",
		rounding: "halfUp",
		arrival: "owed",
		arrivalDate: "",
		owedAccount: "",
		...overrides,
	}
}

describe("the debts a loan that is already owed can attach to", () => {
	test("each liability the Baseline holds is offered with its balance, declared or only in the ledger", () => {
		const choices = owedChoicesOf(planDocument(), owingBaseline())
		expect(choices).toEqual([
			{ id: "loan", name: "Car Loan", balance: "184000.00", declared: true },
			{ id: "01-card", name: "Card", balance: "9000.00", declared: false },
		])
	})

	test("a debt another loan of the plan repays is not offered again", () => {
		const choices = owedChoicesOf(loanPlanDocument(), owingBaseline())
		expect(choices.map((choice) => choice.id)).toEqual(["01-card"])
	})

	test("with no debt in the Baseline, or no Baseline read, the option is unavailable and says why", () => {
		expect(owedUnavailable(owedChoicesOf(planDocument(), baselineRead()))).toContain("no debt")
		expect(owedChoicesOf(planDocument(), undefined)).toEqual([])
		expect(owedUnavailable(owedChoicesOf(planDocument(), owingBaseline()))).toBeNull()
	})

	test("choosing a declared debt attaches the loan to that Account, and a slug of the name is never made", () => {
		const doc = planDocument()
		const choices = owedChoicesOf(doc, owingBaseline())
		const result = loanFromDraft(owedDraft({ owedAccount: "loan" }), { doc, choices })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.loan.account).toMatchObject({ id: "loan", kind: "liability", rate: 500 })
		expect(result.loan.payment).toMatchObject({ id: "car-loan-payment", target: "loan" })
		expect(result.loan.draw).toBeNull()
		const next = loanDocument(doc, result.loan, undefined)
		expect(next.accounts.map((account) => account.id)).toEqual(["bank", "loan"])
	})

	test("choosing a debt only the ledger holds declares it under the ledger's id", () => {
		const doc = planDocument()
		const choices = owedChoicesOf(doc, owingBaseline())
		const result = loanFromDraft(owedDraft({ owedAccount: "01-card" }), { doc, choices })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.loan.account.id).toBe("01-card")
		expect(result.loan.payment.id).toBe("card-payment")
	})

	test("choosing no debt, or one the Baseline does not hold, is refused at the debt field", () => {
		const doc = planDocument()
		const choices = owedChoicesOf(doc, owingBaseline())
		for (const owedAccount of ["", "car-loan"]) {
			const result = loanFromDraft(owedDraft({ owedAccount }), { doc, choices })
			expect(result.ok).toBe(false)
			if (!result.ok) expect(Object.keys(result.problems)).toEqual(["owedAccount"])
		}
	})
})
