import { describe, expect, test } from "bun:test"
import type { ErrorBody } from "../../contract"
import { planDocument } from "./fixtures.test-support"
import { loanDocument, loanOf, withoutLoan } from "./loan-document"
import { type LoanDraft, loanDraftOf, loanFromDraft } from "./loan-draft"
import { loanPlanDocument } from "./loan-fixtures.test-support"
import { loanFieldOfRefusal, loanLayoutOf, loanShown } from "./loan-refusal"

/** A new loan's draft, as the form holds it after the person typed each field. */
function newDraft(overrides: Partial<LoanDraft> = {}): LoanDraft {
	return {
		name: "Boat loan",
		principal: "300000.00",
		rate: "6.25",
		compounding: "monthly",
		payments: "24",
		firstPayment: "2027-07-01",
		rounding: "halfUp",
		arrival: "date",
		arrivalDate: "2027-06-01",
		...overrides,
	}
}

function refusal(path: string, message = "traj refused it"): ErrorBody {
	return { code: "invalid_input", message, path, exitCode: 2 } as unknown as ErrorBody
}

describe("a new loan's ids and parts", () => {
	test("the name becomes the Account, the payment and the withdrawal ids, and the parts are saved", () => {
		const result = loanFromDraft(newDraft(), { doc: planDocument() })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.loan.account).toMatchObject({
			id: "boat-loan",
			kind: "liability",
			rate: 625,
			compounding: "monthly",
		})
		expect(result.loan.payment).toMatchObject({
			id: "boat-loan-payment",
			kind: "contribution",
			target: "boat-loan",
			frequency: "monthly",
			start: "2027-07-01",
			level: { principal: "300000.00", payments: 24, rounding: "halfUp" },
		})
		expect(result.loan.draw).toMatchObject({
			id: "boat-loan-draw",
			kind: "withdrawal",
			frequency: "once",
			start: "2027-06-01",
			amount: "300000.00",
			growth: { bps: 0 },
			source: "boat-loan",
		})
	})

	test("a name already taken takes the next free id, and the payment's and withdrawal's ids with it", () => {
		const doc = loanPlanDocument()
		const result = loanFromDraft(newDraft({ name: "Loan" }), { doc })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.loan.account.id).toBe("loan-2")
		expect(result.loan.payment.id).toBe("loan-2-payment")
	})

	test("a loan the Baseline already holds is saved with no withdrawal", () => {
		const result = loanFromDraft(newDraft({ arrival: "owed", arrivalDate: "" }), {
			doc: planDocument(),
		})
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.loan.draw).toBeNull()
	})

	test("the document gains the three parts and keeps every other item of the plan", () => {
		const doc = planDocument()
		const result = loanFromDraft(newDraft(), { doc })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const next = loanDocument(doc, result.loan, undefined)
		expect(next.accounts.map((account) => account.id)).toEqual(["bank", "loan", "boat-loan"])
		expect(next.flows.map((flow) => flow.id)).toEqual([
			...doc.flows.map((flow) => flow.id),
			"boat-loan-payment",
			"boat-loan-draw",
		])
		expect(next.flows.find((flow) => flow.id === "salary")).toEqual(
			doc.flows.find((flow) => flow.id === "salary"),
		)
	})
})

describe("editing and deleting a loan", () => {
	test("an edit keeps the ids and the fields the form does not show", () => {
		const doc = loanPlanDocument()
		const existing = loanOf(doc, "loan")
		if (existing === undefined) throw new Error("the fixture has no loan")
		const draft = { ...loanDraftOf(existing), principal: "450000.00", rate: "5.5" }
		const result = loanFromDraft(draft, { existing, doc })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.loan.account.id).toBe("loan")
		expect(result.loan.payment.id).toBe("car-loan")
		expect(result.loan.draw?.id).toBe("car-draw")
		expect(result.loan.payment.level).toEqual({
			principal: "450000.00",
			payments: 60,
			rounding: "halfUp",
		})
		expect(result.loan.account.rate).toBe(550)
	})

	test("an edit that makes the money owed takes the withdrawal out, and keeps the payment", () => {
		const doc = loanPlanDocument()
		const existing = loanOf(doc, "loan")
		if (existing === undefined) throw new Error("the fixture has no loan")
		const result = loanFromDraft(
			{ ...loanDraftOf(existing), arrival: "owed", arrivalDate: "" },
			{ existing, doc },
		)
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const next = loanDocument(doc, result.loan, existing)
		expect(next.flows.map((flow) => flow.id)).not.toContain("car-draw")
		expect(next.flows.map((flow) => flow.id)).toContain("car-loan")
	})

	test("deleting a loan removes its Account and every Flow that pays it or borrows from it", () => {
		const doc = loanPlanDocument()
		const next = withoutLoan(doc, "loan")
		expect(next.accounts.map((account) => account.id)).toEqual(["bank"])
		expect(next.flows.map((flow) => flow.id)).toEqual(planDocument().flows.map((flow) => flow.id))
	})
})

describe("the rate and the payment count are read as text", () => {
	test("a percent with two places becomes basis points by its digits, not by a float", () => {
		const result = loanFromDraft(newDraft({ rate: "6.25" }), { doc: planDocument() })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.loan.account.rate).toBe(625)
	})

	test("a rate with three places is refused at the rate field, and nothing is saved", () => {
		const result = loanFromDraft(newDraft({ rate: "6.255" }), { doc: planDocument() })
		expect(result.ok).toBe(false)
		if (!result.ok) expect(Object.keys(result.problems)).toEqual(["rate"])
	})

	test("the rounding has no default: a loan with no rounding chosen is refused at the rounding field", () => {
		const result = loanFromDraft(newDraft({ rounding: "" }), { doc: planDocument() })
		expect(result.ok).toBe(false)
		if (!result.ok) expect(Object.keys(result.problems)).toEqual(["rounding"])
	})

	test("a payment count that is not a whole number is refused at the payments field", () => {
		const result = loanFromDraft(newDraft({ payments: "2.5" }), { doc: planDocument() })
		expect(result.ok).toBe(false)
		if (!result.ok) expect(Object.keys(result.problems)).toEqual(["payments"])
	})
})

describe("a refusal lands on the field its path names", () => {
	const doc = loanPlanDocument()
	const existing = loanOf(doc, "loan")
	if (existing === undefined) throw new Error("the fixture has no loan")
	const layout = loanLayoutOf(doc, existing)

	test("an id path to the payments names the payments field", () => {
		expect(loanFieldOfRefusal(refusal("document.flows.car-loan.level.payments"), layout)).toBe(
			"payments",
		)
	})

	test("an index path to the payments names the payments field too", () => {
		const index = doc.flows.findIndex((flow) => flow.id === "car-loan")
		expect(loanFieldOfRefusal(refusal(`document.flows.${index}.level.payments`), layout)).toBe(
			"payments",
		)
	})

	test("the level as a whole names the principal, and the start of the payment the first payment", () => {
		expect(loanFieldOfRefusal(refusal("document.flows.car-loan.level"), layout)).toBe("principal")
		expect(loanFieldOfRefusal(refusal("document.flows.car-loan.start"), layout)).toBe(
			"firstPayment",
		)
	})

	test("the withdrawal's start names the arrival date, and the loan's rate names the rate", () => {
		expect(loanFieldOfRefusal(refusal("document.flows.car-draw.start"), layout)).toBe("arrivalDate")
		expect(loanFieldOfRefusal(refusal("document.accounts.loan.rate"), layout)).toBe("rate")
	})

	test("a path that names another item, or none, names no loan field", () => {
		expect(loanFieldOfRefusal(refusal("document.flows.salary.amount"), layout)).toBeNull()
		expect(loanFieldOfRefusal(null, layout)).toBeNull()
	})

	test("the shown message is at the field named, and nowhere else", () => {
		const shown = loanShown(
			{},
			refusal("document.flows.car-loan.level.payments"),
			"Too many payments.",
			layout,
		)
		expect(shown.at("payments")).toBe("Too many payments.")
		expect(shown.at("principal")).toBeUndefined()
		expect(shown.general).toBeUndefined()
	})
})
