import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../../contract"
import { withFlowLabel } from "../tax-settings/label-edit"
import { withoutFlow } from "./document"
import { planDocument } from "./fixtures.test-support"
import { heldTaxLabel, newIncomeNeedsTaxLabel, type TaxLabelOffer } from "./tax-label"

const offer: TaxLabelOffer = {
	plan: "base",
	flow: "pension",
}

const untaxed = (): ScenarioDocument => {
	const doc = planDocument()
	delete doc.levies
	return doc
}

describe("the Tax labels page a save offers", () => {
	test("shows while the saved income still has no label", () => {
		expect(heldTaxLabel(offer, "base", planDocument())).toBe(true)
	})

	test("goes away on another plan's Income page, which the notice does not name", () => {
		expect(heldTaxLabel(offer, "other", planDocument())).toBe(false)
	})

	test("goes away once that income is labelled through the side navigation", () => {
		const labelled = withFlowLabel(planDocument(), "pension", "income.section40_1")
		expect(heldTaxLabel(offer, "base", labelled)).toBe(false)
	})

	test("goes away once that income is deleted", () => {
		expect(heldTaxLabel(offer, "base", withoutFlow(planDocument(), "pension"))).toBe(false)
	})

	test("is no notice at all when no save offered one", () => {
		expect(heldTaxLabel(null, "base", planDocument())).toBe(false)
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
