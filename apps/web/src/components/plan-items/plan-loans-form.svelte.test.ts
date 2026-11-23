import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { baselineRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { loanPlanDocument } from "../../lib/view/plan-items/loan-fixtures.test-support"
import PlanItemDrawer from "./PlanItemDrawer.svelte"
import { assets, HASH, runWithLoan } from "./plan-loans.test-support"

/** The loan drawer on a plan, read against a Baseline that holds the given liability rows. */
function loanDrawer(rows: { id: string; name: string; amount: string }[], loanId?: string): string {
	const base = baselineRead()
	if (!base.ok) throw new Error("the fixture is not ok")
	const baseline = {
		...base,
		data: {
			...base.data,
			rows: [
				...base.data.rows,
				...rows.map((row) => ({
					account: { id: row.id, name: row.name },
					kind: "liability" as const,
					amount: row.amount,
				})),
			],
		},
	}
	return render(PlanItemDrawer, {
		props: {
			drawer: { loan: true, ...(loanId === undefined ? {} : { id: loanId }) },
			kind: "assets",
			name: "base",
			doc: planDocument(),
			household: null,
			baseline,
			contentHash: HASH,
			onClose: () => {},
		},
	}).body
}

describe("the loan form's I already owe it", () => {
	test("with no debt in the Baseline the option is not offered, and the reason is shown", () => {
		const body = loanDrawer([])
		expect(body).not.toContain("I already owe it (the Baseline holds the debt)")
		expect(body).toContain('"I already owe it" is unavailable')
		expect(body).toContain("The Baseline holds no debt")
	})

	test("with a debt in the Baseline the option is offered, and the debt is chosen from the Baseline's", () => {
		const body = loanDrawer([{ id: "01-car", name: "Car Loan", amount: "184000.00" }])
		expect(body).toContain("I already owe it (the Baseline holds the debt)")
		expect(body).not.toContain("is unavailable")
	})
})

describe("the loan cards at phone width", () => {
	test("the card, its list and the schedule can shrink, so the schedule scrolls inside its own box", () => {
		const body = assets({ run: runWithLoan() })
		expect(body).toMatch(/<li class="min-w-0 [^"]*"/)
		expect(body).toMatch(/<ul class="grid min-w-0 /)
		expect(body).toMatch(/<section class="min-w-0 space-y-3" aria-label="Loans">/)
		expect(body).toMatch(/class="mt-2 min-w-0 max-w-full space-y-4 overflow-x-auto"/)
	})

	test("a debt a loan repays is shown by its loan card only, not again as a plain card", () => {
		const body = assets()
		expect(body.match(/Edit loan loan/g)?.length).toBe(1)
		expect(body).not.toContain('aria-label="Edit loan"')
		expect(body.match(/Include loan in the what-if/g)?.length).toBe(1)
	})
})

describe("what a What-if cannot try", () => {
	test("the card and the Pay extra form say so where the person would try it", () => {
		expect(assets()).toContain("It cannot pay extra")
		const form = render(PlanItemDrawer, {
			props: {
				drawer: { loan: true, extra: true, id: "loan" },
				kind: "assets",
				name: "base",
				doc: loanPlanDocument(),
				household: null,
				baseline: baselineRead(),
				contentHash: HASH,
				onClose: () => {},
			},
		}).body
		expect(form).toContain("A What-if cannot try it")
	})
})
