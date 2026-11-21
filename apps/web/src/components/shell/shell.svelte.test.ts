import { beforeEach, describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import SiteLink from "../ui/SiteLink.svelte"
import PreferenceControls from "./PreferenceControls.svelte"
import SiteBrand from "./SiteBrand.svelte"
import SiteNavLinks from "./SiteNavLinks.svelte"

const label = createRawSnippet(() => ({ render: () => "Net worth" }))

describe("SiteNavLinks", () => {
	test("marks the current page with aria-current and lists the eight pages in order", () => {
		const { body } = render(SiteNavLinks, { props: { current: "/net-worth/" } })
		expect(body).toMatch(/href="\/net-worth\/" aria-current="page"/)
		expect(body.match(/aria-current="page"/g)?.length).toBe(1)
		const overview = body.indexOf("Overview")
		const health = body.indexOf("Health")
		expect(overview).toBeGreaterThan(-1)
		expect(health).toBeGreaterThan(overview)
	})
})

describe("PreferenceControls", () => {
	test("gives each switch its name and says whether it is on", () => {
		const { body } = render(PreferenceControls, {})
		expect(body).toContain("Hide amounts")
		expect(body).toContain("Dark theme")
		expect(body).toContain('aria-pressed="false"')
	})
})

describe("SiteBrand", () => {
	test("is the link back to Overview, with the artwork hidden from the reader", () => {
		const { body } = render(SiteBrand, { props: { artwork: '<svg focusable="false"></svg>' } })
		expect(body).toContain('href="/"')
		expect(body).toContain('aria-hidden="true"')
		expect(body).toContain("<svg")
		expect(body).toContain("Trajectonomics")
	})
})

describe("SiteLink", () => {
	beforeEach(() => setTestUrl("http://127.0.0.1/net-worth/?demo=1"))

	test("keeps the query string of the page, so ?demo=1 follows the reader", () => {
		const { body } = render(SiteLink, { props: { href: "/ledger/", children: label } })
		expect(body).toContain('href="/ledger/?demo=1"')
	})

	test("adds no query string when the page has none", () => {
		setTestUrl("http://127.0.0.1/net-worth/")
		const { body } = render(SiteLink, { props: { href: "/ledger/", children: label } })
		expect(body).toContain('href="/ledger/"')
	})
})
