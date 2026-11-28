import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import type { Snapshot } from "../lib/contract"
import { documentRead, planDocument } from "../lib/view/plan-items/fixtures.test-support"
import { LOADING } from "../lib/view/state"
import { DEMO } from "../lib/view/what-if/fixtures.test-support"

// The hosted build swaps `lib/view/links.ts` for its twin (ADR 0028); these components are rendered through that
// implementation under the address the Site serves, so a link that skips the base path fails here.
const { withSearch: loopback } = await import("../lib/view/links")
const hosted = (path: string, search: string): string =>
	path.startsWith("#") ? path : `/demo${loopback(path, search)}`
mock.module("../lib/view/links", () => ({ withSearch: hosted }))

const { default: OverviewPage } = await import("../components/pages/OverviewPage.svelte")
const { default: PlansPage } = await import("../components/pages/PlansPage.svelte")
const { default: TaxLabelNotice } = await import("../components/plan-items/TaxLabelNotice.svelte")
const { replaceSnapshot: replace } = await import("../client/snapshot.svelte")
const { taxLabelNotice } = await import("../client/tax-label-notice.svelte.js")

const NO_PLAN: Snapshot = { ...DEMO, params: { ...DEMO.params, scenarios: [], compare: null } }

/** The Demo with a plan whose document is the fixture's: a labelled salary and an unlabelled pension. */
function saved(): Snapshot {
	const next = structuredClone(DEMO)
	next.params.scenarios = ["base"]
	next.reads.documents["base"] = documentRead()
	return next
}

beforeEach(() => {
	setTestUrl("http://127.0.0.1/demo/?demo=1")
	replace(NO_PLAN)
	taxLabelNotice.clear()
})
afterEach(() => {
	taxLabelNotice.clear()
	replace(NO_PLAN)
})
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
	mock.module("../lib/view/links", () => ({ withSearch: loopback }))
})

describe("the pages rendered under the hosted base path", () => {
	test("Home's no-plan action is the guided page under /demo", () => {
		const body = render(OverviewPage, { props: {} }).body
		expect(body).toContain('href="/demo/plans/new/?demo=1"')
		expect(body).toContain('href="/demo/net-worth/?demo=1"')
	})

	test("Home's guided tax step keeps /demo and names the plan", () => {
		replace(saved())
		setTestUrl("http://127.0.0.1/demo/?demo=1&scenario=base")
		taxLabelNotice.offer({ plan: "base", flow: "pension", origin: "guided", taxed: true })
		const body = render(OverviewPage, { props: { scenario: "base" } }).body
		expect(body).toContain('href="/demo/settings/tax/?demo=1&amp;scenario=base"')
	})

	test("Plans' no-plan action is the guided page under /demo", () => {
		const body = render(PlansPage, {
			props: { range: "all", onRange: () => undefined, editable: false },
		}).body
		expect(body).toContain('href="/demo/plans/new/?demo=1"')
	})

	test("the notice's link keeps /demo", () => {
		setTestUrl("http://127.0.0.1/demo/income/?demo=1&scenario=base")
		taxLabelNotice.offer({ plan: "base", flow: "pension", origin: "drawer", taxed: true })
		const body = render(TaxLabelNotice, {
			props: { plan: "base", doc: planDocument(), source: "drawer" },
		}).body
		expect(body).toContain('href="/demo/settings/tax/?demo=1&amp;scenario=base"')
	})
})
