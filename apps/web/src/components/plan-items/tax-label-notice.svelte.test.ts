import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { taxLabelNotice } from "../../client/tax-label-notice.svelte.js"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import TaxLabelNotice from "./TaxLabelNotice.svelte"

const offer = { plan: "base", flow: "pension", href: "/settings/tax/?scenario=base&terms=today" }

afterEach(() => taxLabelNotice.clear())

describe("the notice a saved income shows", () => {
	test("keeps a status mounted with the sentence in it, so a screen reader hears it", () => {
		taxLabelNotice.offer(offer)
		const body = render(TaxLabelNotice, { props: { plan: "base", doc: planDocument() } }).body
		expect(body).toContain('role="status"')
		expect(body).toContain("Give this income a label in")
		expect(body).toContain('href="/settings/tax/?scenario=base&amp;terms=today"')
	})

	test("leaves the status mounted and empty when no save offered a notice", () => {
		const body = render(TaxLabelNotice, { props: { plan: "base", doc: planDocument() } }).body
		expect(body).toContain('role="status"')
		expect(body).not.toContain("Give this income a label in")
	})
})
