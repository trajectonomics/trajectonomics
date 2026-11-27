import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { accountCards } from "../../lib/view/plan-items/accounts"
import { assetCardsOf } from "../../lib/view/plan-items/asset-card"
import { planWithHome } from "../../lib/view/plan-items/asset-fixtures.test-support"
import { homeRun } from "../../lib/view/plan-items/asset-run.test-support"
import type { PlanDrawer } from "../../lib/view/plan-items/drawer"
import { baselineRead } from "../../lib/view/plan-items/fixtures.test-support"
import { flowCards } from "../../lib/view/plan-items/flows"
import { loanCardsOf } from "../../lib/view/plan-items/loan-card"
import { loanPlanDocument } from "../../lib/view/plan-items/loan-fixtures.test-support"
import AccountCards from "./AccountCards.svelte"
import AssetCards from "./AssetCards.svelte"
import FlowCards from "./FlowCards.svelte"
import LoanCards from "./LoanCards.svelte"
import PlanItemDrawer from "./PlanItemDrawer.svelte"
import PlanItemFace from "./PlanItemFace.svelte"
import PlanItemsList from "./PlanItemsList.svelte"
import { runWithLoan } from "./plan-loans.test-support"

const HASH = "jcs1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

/** The card's text: its one `<li>`, with buttons left out, so an Edit or Pay control is no fact of its own. */
function cardText(body: string): string {
	return (/<li[\s\S]*?<\/li>/.exec(body)?.[0] ?? "")
		.replace(/<button[\s\S]*?<\/button>/g, "")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim()
}

describe("the drawer's face", () => {
	const baseline = baselineRead()
	const doc = loanPlanDocument()
	const cards = accountCards(doc.accounts, baseline)
	const loans = loanCardsOf(doc, runWithLoan(), baseline)
	const flows = flowCards(doc.flows, "income")
	const homeDoc = planWithHome()
	const homes = assetCardsOf(homeDoc, baseline, homeRun())
	const lists = {
		flows: { cards: flows, marks: {} },
		accounts: { cards, marks: {} },
		assets: assetCardsOf(doc, baseline, runWithLoan()),
		loans: { cards: loans, marks: {}, other: [] },
	}
	const homeLists = { ...lists, assets: homes }

	function face(
		kind: "income" | "assets",
		drawer: PlanDrawer,
		source = lists,
		currency = doc.currency,
	): string {
		return render(PlanItemFace, {
			props: {
				kind,
				drawer,
				lists: source,
				currency,
				editable: true,
				plan: "base",
				contentHash: HASH,
				onTry: () => {},
				onPay: () => {},
			},
		}).body
	}

	function drawerBody(drawer: PlanDrawer, document = doc): string {
		return render(PlanItemDrawer, {
			props: {
				drawer,
				kind: "assets",
				name: "base",
				doc: document,
				household: null,
				baseline,
				contentHash: HASH,
				onClose: () => {},
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
		expect(cardText(faceBody)).toBe(cardText(full))
		expect(cardText(faceBody)).toContain("Growth")
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
		expect(cardText(faceBody)).toBe(cardText(full))
		expect(cardText(faceBody)).toContain("Baseline balance")
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
		expect(cardText(faceBody)).toBe(cardText(full))
		expect(cardText(faceBody)).toContain("Amount borrowed")
		expect(faceBody).toContain("Schedule")
		expect(faceBody).toContain("Paid off on 31 Jan 2032.")
		expect(faceBody).toContain('aria-label="Pay loan extra"')
		expect(faceBody).not.toContain('aria-label="Edit loan loan"')
		expect(faceBody).not.toContain(">Loans</h2>")
	})

	test("states the same facts as the full card of a home or car, without its Edit control", () => {
		const full = render(AssetCards, {
			props: {
				cards: homes,
				currency: doc.currency,
				editable: true,
				plan: "base",
				contentHash: HASH,
				onEdit: () => {},
				onTry: () => {},
			},
		}).body
		const faceBody = face("assets", { id: "home", asset: true }, homeLists)
		expect(cardText(faceBody)).toBe(cardText(full))
		expect(cardText(faceBody)).toContain("Running costs")
		expect(faceBody).not.toContain('aria-label="Edit asset home"')
		expect(faceBody).not.toContain(">Homes and cars</h2>")
	})

	test("a loan's What-if opens the loan's terms form, not the Account form", () => {
		const body = drawerBody({ id: "loan", loan: true, tryValue: true })
		expect(body).toContain('aria-label="Edit loan loan"')
		expect(body).toContain('id="loan-arrival"')
		expect(body).not.toContain('id="account-rate"')
	})

	test("a home or car's What-if opens the asset form", () => {
		const body = drawerBody({ id: "home", asset: true, tryValue: true }, homeDoc)
		expect(body).toContain('aria-label="Edit asset home"')
		expect(body).toContain('id="asset-rate"')
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
