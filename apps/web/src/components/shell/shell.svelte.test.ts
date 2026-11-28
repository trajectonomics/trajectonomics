import { beforeEach, describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { preferences } from "../../client/preferences.svelte.js"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { Snapshot } from "../../lib/contract"
import { LOADING } from "../../lib/view/state"
import SiteLink from "../ui/SiteLink.svelte"
import PreferenceControls from "./PreferenceControls.svelte"
import SiteBrand from "./SiteBrand.svelte"
import SiteNavLinks from "./SiteNavLinks.svelte"

const label = createRawSnippet(() => ({ render: () => "Net worth" }))
const noop = () => {}

describe("SiteNavLinks", () => {
	beforeEach(() => setTestUrl("http://127.0.0.1/net-worth/"))

	test("lists the nine top-level entries under their headings, in order, in one labelled navigation", () => {
		const { body } = render(SiteNavLinks, { props: { current: "/net-worth/", onNavigate: noop } })
		expect(body).toContain('<nav aria-label="Pages"')
		const order = [
			"Overview",
			"Net worth",
			"Plan",
			"Milestones",
			"Compare plans",
			"Reports",
			"Cash flow",
			"Chance of success",
			"Tax",
			"Optimize",
			"Tax allowances",
			"Withdrawals",
			"Estate",
			"Records",
			"Ledger",
			"Health",
			"Settings",
			"Tax profile",
			"Assumptions",
			"Display",
		]
		const at = (text: string) => body.indexOf(text)
		for (const [index, text] of order.entries()) {
			expect(at(text), text).toBeGreaterThan(-1)
			if (index > 0) expect(at(text), text).toBeGreaterThan(at(order[index - 1] ?? ""))
		}
	})

	test("makes each heading a button that says whether its group is open", () => {
		const { body } = render(SiteNavLinks, { props: { current: "/net-worth/", onNavigate: noop } })
		expect(body).toMatch(/<button[^>]*aria-expanded="true"[^>]*aria-controls="nav-pages-plan"/)
		expect(body).toMatch(/<button[^>]*aria-expanded="true"[^>]*aria-controls="nav-pages-optimize"/)
		expect(body).toMatch(/<button[^>]*aria-expanded="false"[^>]*aria-controls="nav-pages-records"/)
		expect(body).toMatch(/<button[^>]*aria-expanded="false"[^>]*aria-controls="nav-pages-settings"/)
	})

	test("keeps a closed group's list hidden, and shows the open groups' lists", () => {
		const { body } = render(SiteNavLinks, { props: { current: "/net-worth/", onNavigate: noop } })
		expect(body).toMatch(/<ul id="nav-pages-plan"[^>]*>/)
		expect(body).toMatch(/<ul id="nav-pages-records"[^>]*\bhidden\b/)
	})

	test("keeps a group holding the current page open, though it starts closed", () => {
		const { body } = render(SiteNavLinks, { props: { current: "/health/", onNavigate: noop } })
		expect(body).toMatch(/<button[^>]*aria-expanded="true"[^>]*aria-controls="nav-pages-records"/)
		expect(body).not.toMatch(/<ul id="nav-pages-records"[^>]*\bhidden\b/)
		expect(body).toMatch(/<a[^>]*href="\/health\/"[^>]*aria-current="page"/)
	})

	test("marks the current page with aria-current, and only that page", () => {
		const { body } = render(SiteNavLinks, { props: { current: "/net-worth/", onNavigate: noop } })
		const anchor = [...body.matchAll(/<a\b[^>]*>/g)]
			.map((match) => match[0])
			.find((tag) => tag.includes('href="/net-worth/"'))
		expect(anchor).toBeDefined()
		expect(anchor).toContain('aria-current="page"')
		expect(body.match(/aria-current="page"/g)?.length).toBe(1)
	})

	test("keeps the scenario and demo parameters on every link, so the plan stays chosen", () => {
		setTestUrl("http://127.0.0.1/net-worth/?demo=1&scenario=retire-early")
		const { body } = render(SiteNavLinks, { props: { current: "/", onNavigate: noop } })
		expect(body).toContain('href="/tax/?demo=1&amp;scenario=retire-early"')
		expect(body).toContain('href="/projection/?demo=1&amp;scenario=retire-early"')
	})

	test("does not list the pages that left the navigation, though their routes stay", () => {
		const { body } = render(SiteNavLinks, { props: { current: "/", onNavigate: noop } })
		for (const path of ["/income/", "/expenses/", "/assets-and-debts/", "/fi/", "/routing/"]) {
			expect(body).not.toContain(`href="${path}"`)
		}
	})

	test("says on the Records heading how many of the ledger's health checks failed", () => {
		const checks = [{ name: "writable", status: "fail", detail: "not writable" }]
		const doctor = {
			ok: false,
			cliVersion: "0.0.0",
			directory: { path: "~/.traj", exists: true, writable: false },
			database: { path: "~/.traj/traj.db", exists: true, bytes: 0, schemaVersion: 2, head: 2 },
			rows: { entity: 0, account: 0, tx: 0, posting: 0, scenario: 0 },
			checks,
		}
		const snapshot = {
			reads: { doctor: { ok: true, argv: ["doctor"], data: doctor } },
		} as unknown as Snapshot
		try {
			replaceSnapshot(snapshot)
			const { body } = render(SiteNavLinks, { props: { current: "/net-worth/", onNavigate: noop } })
			expect(body).toContain('aria-label="1 thing to check"')
			expect(body).toContain("bg-accent")
		} finally {
			snapshotLoader.replace(LOADING)
		}
	})

	test("lists the Milestones page only when the selected plan's projection has milestones", () => {
		const shown = render(SiteNavLinks, { props: { current: "/", onNavigate: noop } }).body
		expect(shown).toContain('href="/milestones/"')
		const hidden = render(SiteNavLinks, {
			props: { current: "/", onNavigate: noop, milestones: false },
		}).body
		expect(hidden).not.toContain('href="/milestones/"')
		expect(hidden).toContain('href="/projection/"')
	})
})

describe("PreferenceControls", () => {
	test("offers the Theme switch, and no Hide amounts switch while that feature is off", () => {
		const saved = preferences.theme
		try {
			preferences.theme = "light"
			const { body } = render(PreferenceControls, {})
			expect(body).toContain("Dark theme")
			expect(body).not.toContain("Hide amounts")
			expect(body).toContain('aria-pressed="false"')
		} finally {
			preferences.theme = saved
		}
	})
})

describe("SiteBrand", () => {
	beforeEach(() => setTestUrl("http://127.0.0.1/"))

	test("is the link back to the Overview, with the artwork hidden from the reader", () => {
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
