import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { accountCards } from "../../lib/view/plan-items/accounts"
import { baselineRead } from "../../lib/view/plan-items/fixtures.test-support"
import { flowCards } from "../../lib/view/plan-items/flows"
import { loanCardsOf } from "../../lib/view/plan-items/loan-card"
import { loanPlanDocument } from "../../lib/view/plan-items/loan-fixtures.test-support"
import AccountCards from "./AccountCards.svelte"
import FlowCards from "./FlowCards.svelte"
import LoanCards from "./LoanCards.svelte"
import PlanItemFace from "./PlanItemFace.svelte"
import PlanItemsList from "./PlanItemsList.svelte"
import PlanMilestoneCards from "./PlanMilestoneCards.svelte"
import { runWithLoan } from "./plan-loans.test-support"

const HASH = "jcs1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
const LABELS = /<dt[^>]*>(.*?)<\/dt>/g

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

/** The fact labels a full card states, in order. */
function labels(body: string): string[] {
	return [...body.matchAll(LABELS)].map((match) => match[1] ?? "")
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

	test("link each Milestone to its own row on the Milestones page, keeping the address's parameters", () => {
		setTestUrl("http://127.0.0.1/projection/?demo=1&scenario=base")
		try {
			const body = render(PlanMilestoneCards, {
				props: {
					cards: [
						{ id: "retire", date: "1 Jun 2027", notReachedBy: null, how: "On a date" },
						{ id: "never", date: null, notReachedBy: "2053", how: "" },
					],
				},
			}).body
			expect(body).toContain('href="/milestones/?demo=1&amp;scenario=base#retire"')
			expect(body).toContain("Not reached by 2053")
		} finally {
			setTestUrl("http://127.0.0.1/")
		}
	})
})

describe("the drawer's face", () => {
	const baseline = baselineRead()
	const doc = loanPlanDocument()
	const cards = accountCards(doc.accounts, baseline)
	const loans = loanCardsOf(doc, runWithLoan(), baseline)
	const flows = flowCards(doc.flows, "income")
	const lists = {
		flows: { cards: flows, marks: {} },
		accounts: { cards, marks: {} },
		assets: [],
		loans: { cards: loans, marks: {}, other: [] },
	}

	function face(kind: "income" | "assets", drawer: { id: string; loan?: boolean }): string {
		return render(PlanItemFace, {
			props: {
				kind,
				drawer,
				lists,
				currency: doc.currency,
				editable: true,
				plan: "base",
				contentHash: HASH,
				onTry: () => {},
			},
		}).body
	}

	test("states the same facts as the full card of a Flow, without its Edit control", () => {
		const full = render(FlowCards, {
			props: {
				cards: flows.filter((card) => card.id === "salary"),
				currency: doc.currency,
				editable: true,
				plan: "base",
				contentHash: HASH,
				onEdit: () => {},
				onTry: () => {},
			},
		}).body
		const faceBody = face("income", { id: "salary" })
		expect(labels(faceBody)).toEqual(labels(full))
		expect(labels(faceBody).length).toBeGreaterThan(0)
		expect(faceBody).not.toContain('aria-label="Edit salary"')
		expect(faceBody).toContain("What if…")
	})

	test("states the same facts as the full card of an Account, without its Edit control", () => {
		const full = render(AccountCards, {
			props: {
				cards: cards.filter((card) => card.id === "bank"),
				currency: doc.currency,
				editable: true,
				plan: "base",
				contentHash: HASH,
				onEdit: () => {},
				onTry: () => {},
			},
		}).body
		const faceBody = face("assets", { id: "bank" })
		expect(labels(faceBody)).toEqual(labels(full))
		expect(faceBody).not.toContain('aria-label="Edit Bank"')
	})

	test("states a loan's terms, its schedule and its statement as its full card does", () => {
		const full = render(LoanCards, {
			props: {
				cards: loans,
				currency: doc.currency,
				editable: true,
				plan: "base",
				contentHash: HASH,
				onEdit: () => {},
				onPay: () => {},
				onTry: () => {},
			},
		}).body
		const faceBody = face("assets", { id: "loan", loan: true })
		expect(labels(faceBody)).toEqual(labels(full))
		expect(faceBody).toContain("Schedule")
		expect(faceBody).toContain("Paid off on 31 Jan 2032.")
		expect(faceBody).not.toContain('aria-label="Edit loan loan"')
		expect(faceBody).not.toContain('aria-label="Pay loan extra"')
	})

	test("a loan's compact card shows the balance the Baseline states, which is negative", () => {
		if (!baseline.ok) throw new Error("the fixture Baseline reads")
		const owed = {
			...baseline,
			data: {
				...baseline.data,
				rows: [
					...baseline.data.rows,
					{
						account: { id: "loan", name: "Car loan" },
						kind: "liability" as const,
						amount: "-500000.00",
					},
				],
			},
		}
		const body = render(PlanItemsList, {
			props: {
				kind: "assets",
				name: "base",
				doc,
				household: null,
				baseline: owed,
				run: runWithLoan(),
				editable: true,
				contentHash: HASH,
				density: "compact",
			},
		}).body
		expect(body).toContain("−500k")
		expect(body).toContain("500,000.00")
	})
})
