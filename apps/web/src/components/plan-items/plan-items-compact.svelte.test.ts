import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { baselineRead } from "../../lib/view/plan-items/fixtures.test-support"
import { loanPlanDocument } from "../../lib/view/plan-items/loan-fixtures.test-support"
import PlanItemsList from "./PlanItemsList.svelte"
import PlanMilestoneCards from "./PlanMilestoneCards.svelte"
import { runWithLoan } from "./plan-loans.test-support"

const HASH = "jcs1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

function compact(kind: "income" | "expense" | "assets", editable = true): string {
	return render(PlanItemsList, {
		props: {
			kind,
			name: "base",
			doc: loanPlanDocument(),
			household: null,
			baseline: baselineRead(),
			run: runWithLoan(),
			editable,
			contentHash: HASH,
			density: "compact",
		},
	}).body
}

describe("the Plan's compact cards", () => {
	test("draw each Flow as one button with its name, a compact amount and one line, and no fact grid", () => {
		const body = compact("income")
		// The three income Flows, and the dashed card that adds another.
		expect(body.match(/aria-haspopup="dialog"/g)).toHaveLength(4)
		expect(body).toContain("90k")
		expect(body).toContain("90,000.00")
		expect(body).toContain("a month · until May 2050 · grows with inflation")
		expect(body).not.toContain("<dt")
		expect(body).not.toContain('aria-label="Edit salary"')
	})

	test("keep the account's value, and show a loan's balance and paid-off month", () => {
		const body = compact("assets")
		expect(body).toContain("662k")
		expect(body).toContain("paid off Jan 2032")
		expect(body).toContain('aria-haspopup="dialog"')
		expect(body).not.toContain("<dt")
	})

	test("add the dashed card last, switched off and explained when the page cannot edit", () => {
		const editable = compact("expense")
		expect(editable).toContain("+ Add expense")
		expect(editable).not.toContain("Add expense: switched off in this demo")
		const readOnly = compact("expense", false)
		expect(readOnly).toContain("+ Add expense")
		expect(readOnly).toContain("Add expense: switched off in this demo")
	})

	test("offer the dashed cards that add a loan and a home or car", () => {
		const editable = compact("assets")
		expect(editable).toContain("+ Add account")
		expect(editable).toContain("+ Add loan")
		expect(editable).toContain("+ Add a home or car")
		const readOnly = compact("assets", false)
		expect(readOnly).toContain("Add loan: switched off in this demo")
		expect(readOnly).toContain("Add a home or car: switched off in this demo")
	})

	test("link each Milestone to its own row on the Milestones page, keeping the address's parameters", () => {
		setTestUrl("http://127.0.0.1/projection/?demo=1&scenario=base")
		try {
			const body = render(PlanMilestoneCards, {
				props: {
					cards: [
						{
							id: "retire",
							date: "1 Jun 2027",
							notReachedBy: null,
							terms: { words: "On a date", amount: null },
						},
						{
							id: "worth",
							date: null,
							notReachedBy: "2053",
							terms: { words: "When net worth reaches", amount: "10000000.00" },
						},
						{ id: "never", date: null, notReachedBy: "2053", terms: { words: "", amount: null } },
					],
				},
			}).body
			expect(body).toContain('href="/milestones/?demo=1&amp;scenario=base#retire"')
			expect(body).toContain("Not reached by 2053")
			expect(body).toContain("When net worth reaches")
			expect(body).toContain("10M")
			// The exact amount stays in the accessible text of the compact figure.
			expect(body).toContain("10,000,000.00")
		} finally {
			setTestUrl("http://127.0.0.1/")
		}
	})
})
