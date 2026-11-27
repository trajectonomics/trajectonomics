import { describe, expect, test } from "bun:test"
import { withFlowLabel } from "../tax-settings/label-edit"
import { withoutFlow } from "./document"
import { planDocument } from "./fixtures.test-support"
import { heldTaxLabelHref, type TaxLabelOffer } from "./tax-label"

const offer: TaxLabelOffer = {
	plan: "base",
	flow: "pension",
	href: "/settings/tax/?scenario=base",
}

describe("the Tax labels page a save offers", () => {
	test("shows while the saved income still has no label", () => {
		expect(heldTaxLabelHref(offer, "base", planDocument())).toBe(offer.href)
	})

	test("goes away on another plan's Income page, which the notice does not name", () => {
		expect(heldTaxLabelHref(offer, "other", planDocument())).toBeNull()
	})

	test("goes away once that income is labelled through the side navigation", () => {
		const labelled = withFlowLabel(planDocument(), "pension", "income.section40_1")
		expect(heldTaxLabelHref(offer, "base", labelled)).toBeNull()
	})

	test("goes away once that income is deleted", () => {
		expect(heldTaxLabelHref(offer, "base", withoutFlow(planDocument(), "pension"))).toBeNull()
	})

	test("is no notice at all when no save offered one", () => {
		expect(heldTaxLabelHref(null, "base", planDocument())).toBeNull()
	})
})
