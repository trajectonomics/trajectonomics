import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { ScenarioDocument } from "../../lib/contract"
import { baselineRead } from "../../lib/view/plan-items/fixtures.test-support"
import { loanPlanDocument } from "../../lib/view/plan-items/loan-fixtures.test-support"
import PlanItemDrawer from "./PlanItemDrawer.svelte"
import { assets, HASH, runWithLoan } from "./plan-loans.test-support"

describe("the loans on the Assets and debts page", () => {
	test("each loan is a card with Edit, Pay extra and a what-if switch, and the page adds a loan", () => {
		const body = assets()
		expect(body).toContain("Loans")
		expect(body).toContain('aria-label="Edit loan loan"')
		expect(body).toContain('aria-label="Pay loan extra"')
		expect(body).toContain("Add loan")
		expect(body).toContain("Rounded to the nearest")
		expect(body).toContain("60 equal monthly payments")
		expect(body).toContain("On 1 Jan 2027")
		expect(body).toContain('aria-label="Include loan in the what-if"')
	})

	test("the loan's terms are the document's, and its amount borrowed is the payment's principal", () => {
		const body = assets()
		expect(body).toContain("Amount borrowed")
		expect(body).toContain("500,000.00")
		expect(body).toContain("5.00% a year, monthly interest")
	})

	test("with no statement read, the card says so and shows no payment the page computed", () => {
		const body = assets()
		expect(body).toContain("No schedule in this Projection.")
		expect(body).toContain("not reported")
	})

	test("the statement's payment, paid-off date and schedule come from the Projection run", () => {
		const body = assets({ run: runWithLoan() })
		expect(body).toContain("Paid off on 31 Jan 2032.")
		expect(body).toContain('aria-label="Schedule 2027"')
		expect(body).toContain("Feb 2027")
		expect(body).toContain("492,083.33")
	})

	test("with the server not answering, the page shows the loan read-only, with no Edit control", () => {
		const body = assets({ editable: false })
		expect(body).toContain("Loan")
		expect(body).not.toContain('aria-label="Edit loan loan"')
		expect(body).not.toContain('aria-label="Pay loan extra"')
		expect(body).not.toContain("Add loan")
		expect(body).not.toContain('aria-label="Include loan in the what-if"')
	})

	test("a withdrawal that no loan's payment repays is listed read-only, apart from the loans", () => {
		const doc = loanPlanDocument()
		const unpaid = { ...doc, flows: doc.flows.filter((flow) => flow.id !== "car-loan") }
		const body = assets({ doc: unpaid })
		expect(body).toContain("Other loan Flows")
		expect(body).toContain("Read-only: a withdrawal or a payment")
		expect(body).not.toContain('aria-label="Edit loan loan"')
	})
})

describe("the drawers of the planner", () => {
	test("the loan form asks for each term, with no rounding chosen", () => {
		const body = render(PlanItemDrawer, {
			props: {
				drawer: { loan: true },
				kind: "assets",
				name: "base",
				doc: loanPlanDocument(),
				household: null,
				baseline: baselineRead(),
				contentHash: HASH,
				onClose: () => {},
			},
		}).body
		expect(body).toContain('id="loan-principal"')
		expect(body).toContain('id="loan-rate"')
		expect(body).toContain('id="loan-payments"')
		expect(body).toContain('id="loan-rounding"')
		expect(body).toContain("Choose how a payment rounds")
	})

	test("the expense form offers a category field, with the plan's categories as suggestions", () => {
		const doc = loanPlanDocument()
		const withCategory: ScenarioDocument = {
			...doc,
			flows: [
				...doc.flows,
				{
					id: "food",
					kind: "expense",
					frequency: "monthly",
					start: "2026-11-01",
					amount: "4000.00",
					growth: "inflation",
					category: "Food",
				},
			],
		}
		const body = render(PlanItemDrawer, {
			props: {
				drawer: {},
				kind: "expense",
				name: "base",
				doc: withCategory,
				household: null,
				baseline: baselineRead(),
				contentHash: HASH,
				onClose: () => {},
			},
		}).body
		expect(body).toContain('id="flow-category"')
		expect(body).toContain('<option value="Food"></option>')
	})
})
