import { describe, expect, test } from "bun:test"
import type { ScenarioDocument, Snapshot } from "../../contract"
import { withFlowLabel } from "../tax-settings/label-edit"
import { DEMO } from "../what-if/fixtures.test-support"
import { withoutFlow } from "./document"
import { documentRead, planDocument } from "./fixtures.test-support"
import {
	firstTaxLabelOffer,
	heldTaxLabel,
	heldTaxLabelOffer,
	heldTaxStep,
	newIncomeNeedsTaxLabel,
	type TaxLabelOffer,
} from "./tax-label"

const offer: TaxLabelOffer = {
	plan: "base",
	flow: "pension",
	origin: "drawer",
	taxed: true,
}

const untaxed = (): ScenarioDocument => {
	const doc = planDocument()
	delete doc.levies
	return doc
}

/** The Demo with a plan whose document is `doc`. */
function snapshotWith(doc: ScenarioDocument): Snapshot {
	const next = structuredClone(DEMO)
	next.params.scenarios = ["base"]
	next.reads.documents["base"] = documentRead(doc)
	return next
}

describe("the Tax labels page a drawer save offers", () => {
	test("shows while the saved income still has no label", () => {
		expect(heldTaxLabel(offer, "base", "drawer", planDocument())).toBe(true)
	})

	test("goes away on another plan's Income page, which the notice does not name", () => {
		expect(heldTaxLabel(offer, "other", "drawer", planDocument())).toBe(false)
	})

	test("goes away on an income page a guided save offered", () => {
		expect(heldTaxLabel(offer, "base", "guided", planDocument())).toBe(false)
		expect(heldTaxLabelOffer(null, "base", "drawer")).toBe(false)
	})

	test("goes away once that income is labelled, even while another is not", () => {
		const labelled = withFlowLabel(planDocument(), "pension", "income.section40_1")
		expect(heldTaxLabel(offer, "base", "drawer", labelled)).toBe(false)
	})

	test("goes away once that income is deleted", () => {
		expect(heldTaxLabel(offer, "base", "drawer", withoutFlow(planDocument(), "pension"))).toBe(
			false,
		)
	})
})

describe("the next step Home keeps after a guided save", () => {
	test("stays while any income Flow of that plan has no label", () => {
		const labelled = withFlowLabel(planDocument(), "pension", "income.section40_1")
		expect(heldTaxStep(offer, "base", "drawer", labelled)).toBe(true)
		const all = withFlowLabel(labelled, "tax-refund", "income.section40_1")
		expect(heldTaxStep(offer, "base", "drawer", all)).toBe(false)
	})

	test("is no notice at all when no save offered one", () => {
		expect(heldTaxStep(null, "base", "drawer", planDocument())).toBe(false)
	})
})

describe("the notice a new income shows in a taxed plan", () => {
	test("shows for a new income in a plan with a Levy", () => {
		expect(newIncomeNeedsTaxLabel(planDocument(), "income", undefined)).toBe(true)
	})

	test("is no notice for an edit, a plan without a Levy, or an expense", () => {
		const salary = planDocument().flows[0]
		expect(newIncomeNeedsTaxLabel(planDocument(), "income", salary)).toBe(false)
		expect(newIncomeNeedsTaxLabel(untaxed(), "income", undefined)).toBe(false)
		expect(newIncomeNeedsTaxLabel(planDocument(), "expense", undefined)).toBe(false)
	})
})

describe("the offer a guided save records", () => {
	test("names the first unlabelled income, the guided page and whether the plan is taxed", () => {
		expect(firstTaxLabelOffer(snapshotWith(planDocument()), "base")).toEqual({
			plan: "base",
			flow: "pension",
			origin: "guided",
			taxed: true,
		})
		expect(firstTaxLabelOffer(snapshotWith(untaxed()), "base")).toMatchObject({ taxed: false })
	})

	test("is nothing once every income has its label, or the document is not read", () => {
		const document = planDocument()
		const labelled = {
			...document,
			flows: document.flows.filter((flow) => flow.kind !== "income" || flow.id === "salary"),
		}
		expect(firstTaxLabelOffer(snapshotWith(labelled), "base")).toBeNull()
		expect(firstTaxLabelOffer(snapshotWith(planDocument()), "other")).toBeNull()
	})
})
