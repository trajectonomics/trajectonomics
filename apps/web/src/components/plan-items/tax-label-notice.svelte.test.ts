import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { taxLabelNotice } from "../../client/tax-label-notice.svelte.js"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import TaxLabelNotice from "./TaxLabelNotice.svelte"

const offer = { plan: "base", flow: "pension" }

const body = (): string =>
	render(TaxLabelNotice, { props: { plan: "base", doc: planDocument() } }).body

afterEach(() => {
	taxLabelNotice.clear()
	setTestUrl("http://127.0.0.1/")
})

describe("the notice a saved income shows", () => {
	test("keeps a status mounted with the sentence in it, so a screen reader hears it", () => {
		setTestUrl("http://127.0.0.1/income/?scenario=base&terms=today")
		taxLabelNotice.offer(offer)
		const rendered = body()
		expect(rendered).toContain('role="status"')
		expect(rendered).toContain("Give this income a label in")
		expect(rendered).toContain('href="/settings/tax/?scenario=base&amp;terms=today"')
	})

	test("links with the query the page shows now, not the one it showed when the income was saved", () => {
		setTestUrl("http://127.0.0.1/income/?scenario=base&terms=today")
		taxLabelNotice.offer(offer)
		setTestUrl("http://127.0.0.1/income/?scenario=base&terms=nominal")
		expect(body()).toContain('href="/settings/tax/?scenario=base&amp;terms=nominal"')
	})

	test("leaves the status mounted and empty when no save offered a notice", () => {
		const rendered = body()
		expect(rendered).toContain('role="status"')
		expect(rendered).not.toContain("Give this income a label in")
	})
})
