import { beforeEach, describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import SiteLink from "../ui/SiteLink.svelte"
import DisplayOptions from "./DisplayOptions.svelte"
import PlanSwitcher from "./PlanSwitcher.svelte"
import PreferenceControls from "./PreferenceControls.svelte"
import SiteBrand from "./SiteBrand.svelte"
import SiteNavLinks from "./SiteNavLinks.svelte"

const label = createRawSnippet(() => ({ render: () => "Net worth" }))
const noop = () => {}

describe("SiteNavLinks", () => {
	beforeEach(() => setTestUrl("http://127.0.0.1/net-worth/"))

	test("groups the pages under their headings, in order, in one labelled navigation", () => {
		const { body } = render(SiteNavLinks, { props: { current: "/net-worth/", onNavigate: noop } })
		expect(body).toContain('<nav aria-label="Pages"')
		const at = (text: string) => body.indexOf(text)
		expect(at("Home")).toBeGreaterThan(-1)
		expect(at("Net worth")).toBeGreaterThan(at("Home"))
		expect(at(">Plan<")).toBeGreaterThan(at("Net worth"))
		expect(at("Overview")).toBeGreaterThan(at(">Plan<"))
		expect(at("FI date")).toBeGreaterThan(at("Overview"))
		expect(at("Compare")).toBeGreaterThan(at("FI date"))
		expect(at("Tax")).toBeGreaterThan(at("Compare"))
		expect(at(">Records<")).toBeGreaterThan(at("Tax"))
		expect(at("Ledger")).toBeGreaterThan(at(">Records<"))
		expect(at("Health")).toBeGreaterThan(at("Ledger"))
	})

	test("marks the current page with aria-current, and only that page", () => {
		const { body } = render(SiteNavLinks, { props: { current: "/net-worth/", onNavigate: noop } })
		expect(body).toMatch(/href="\/net-worth\/" aria-current="page"/)
		expect(body.match(/aria-current="page"/g)?.length).toBe(1)
	})

	test("keeps the scenario and demo parameters on every link, so the plan stays chosen", () => {
		setTestUrl("http://127.0.0.1/net-worth/?demo=1&scenario=retire-early")
		const { body } = render(SiteNavLinks, { props: { current: "/", onNavigate: noop } })
		expect(body).toContain('href="/tax/?demo=1&amp;scenario=retire-early"')
		expect(body).toContain('href="/projection/?demo=1&amp;scenario=retire-early"')
	})

	test("lists the Income, Expenses and Assets and debts pages only when the plan's document is held", () => {
		const shown = render(SiteNavLinks, { props: { current: "/", onNavigate: noop } }).body
		expect(shown).toContain('href="/income/"')
		expect(shown).toContain('href="/assets-and-debts/"')
		const hidden = render(SiteNavLinks, {
			props: { current: "/", onNavigate: noop, planDocument: false },
		}).body
		expect(hidden).not.toContain('href="/income/"')
		expect(hidden).not.toContain('href="/expenses/"')
		expect(hidden).toContain('href="/fi/"')
	})
})

describe("PlanSwitcher", () => {
	test("offers each Scenario name and selects the one the pages show", () => {
		const { body } = render(PlanSwitcher, {
			props: { names: ["base", "retire-early"], selected: "retire-early", onChange: noop },
		})
		expect(body).toContain("<select")
		expect(body).toContain("Scenario")
		expect(body).toMatch(/<option value="base"/)
		expect(body).toMatch(/<option value="retire-early" selected/)
	})

	test("is hidden when the Snapshot names no Scenario", () => {
		const { body } = render(PlanSwitcher, { props: { names: [], selected: "", onChange: noop } })
		expect(body).not.toContain("<select")
	})
})

describe("DisplayOptions", () => {
	test("is a dialog that holds both switches, named and with their state", () => {
		const { body } = render(DisplayOptions, {})
		expect(body).toContain("<dialog")
		expect(body).toContain("Display options")
		expect(body).toContain("Hide amounts")
		expect(body).toContain("Dark theme")
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
	beforeEach(() => setTestUrl("http://127.0.0.1/"))

	test("is the link back to Home, with the artwork hidden from the reader", () => {
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

describe("the plan actions", () => {
	test("are offered only when the server answers Edits, never in the Demo snapshot", () => {
		const names = ["base"]
		const readOnly = render(PlanSwitcher, { props: { names, selected: "base", onChange: noop } })
		expect(readOnly.body).not.toContain("Copy plan")
		expect(readOnly.body).not.toContain("Delete plan")
		const editing = render(PlanSwitcher, {
			props: { names, selected: "base", onChange: noop, editable: true },
		})
		expect(editing.body).toContain("Copy plan")
		expect(editing.body).toContain("Delete plan")
	})
})
