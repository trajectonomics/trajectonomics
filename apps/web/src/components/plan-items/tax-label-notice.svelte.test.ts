import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { taxLabelNotice } from "../../client/tax-label-notice.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import type { TaxLabelOffer } from "../../lib/view/plan-items/tax-label"
import TaxLabelNotice from "./TaxLabelNotice.svelte"

const offer: TaxLabelOffer = { plan: "base", flow: "pension", origin: "drawer", taxed: true }

/** The notice's markup: by default the income page's drawer note for base, whose pension has no label. */
function body(
	props: {
		plan?: string
		doc?: ScenarioDocument | null
		source?: "guided" | "drawer"
		next?: boolean
	} = {},
): string {
	return render(TaxLabelNotice, {
		props: { plan: "base", doc: planDocument(), source: "drawer", ...props },
	}).body
}

afterEach(() => {
	taxLabelNotice.clear()
	setTestUrl("http://127.0.0.1/")
})

describe("the notice a saved income shows", () => {
	test("keeps a status mounted empty, with the sentence beside it", () => {
		setTestUrl("http://127.0.0.1/income/?scenario=base&terms=today")
		taxLabelNotice.offer(offer)
		const rendered = body()
		expect(rendered).toContain('<p role="status" class="sr-only"></p>')
		expect(rendered).toContain("Give this income a label in")
		expect(rendered).toContain('href="/settings/tax/?scenario=base&amp;terms=today"')
		expect(rendered).toContain("focus-visible:outline-2")
	})

	test("mounts the status region empty, so the sentence is announced once the region is on the page", () => {
		setTestUrl("http://127.0.0.1/?scenario=base&demo=1")
		taxLabelNotice.offer({ ...offer, origin: "guided" })
		const rendered = body({ source: "guided", next: true })
		expect(rendered).toContain('<p role="status" class="sr-only"></p>')
		expect(rendered).toContain("Next: give your income its tax labels in")
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

	test("leads with Next on the page a guided save lands on", () => {
		setTestUrl("http://127.0.0.1/?scenario=base&demo=1")
		taxLabelNotice.offer({ ...offer, origin: "guided" })
		const rendered = body({ source: "guided", next: true })
		expect(rendered).toContain("Next: give your income its tax labels in")
		expect(rendered).toContain('href="/settings/tax/?scenario=base&amp;demo=1"')
	})

	test("sends an untaxed plan to its Tax profile, which has no labels section yet", () => {
		setTestUrl("http://127.0.0.1/?scenario=base&demo=1")
		taxLabelNotice.offer({ ...offer, origin: "guided", taxed: false })
		const rendered = body({ source: "guided", next: true })
		expect(rendered).toContain("Next: set up tax in")
		expect(rendered).toContain(">Tax profile</a>")
		expect(rendered).not.toContain("give your income its tax labels")
	})

	test("trusts the offer while the saved plan is not opened, and names only that plan and page", () => {
		taxLabelNotice.offer(offer)
		expect(body({ doc: null })).toContain("Give this income a label in")
		expect(body({ doc: null, plan: "other" })).not.toContain("Give this income a label in")
		expect(body({ doc: null, source: "guided" })).not.toContain("Give this income a label in")
	})

	test("keeps a drawer's note off Home, and a guided step off the income page", () => {
		taxLabelNotice.offer(offer)
		expect(body({ source: "guided", next: true })).not.toContain("Next:")
		taxLabelNotice.offer({ ...offer, origin: "guided" })
		expect(body()).not.toContain("Give this income a label in")
	})
})
