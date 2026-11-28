import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { taxLabelNotice } from "../../client/tax-label-notice.svelte.js"
import { withSearch as hostedWithSearch } from "../../hosted/links"
import type { Snapshot } from "../../lib/contract"
import { documentRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import OverviewPage from "./OverviewPage.svelte"

const NO_PLAN: Snapshot = { ...DEMO, params: { ...DEMO.params, scenarios: [], compare: null } }

beforeEach(() => {
	setTestUrl("http://127.0.0.1/?demo=1")
	replaceSnapshot(NO_PLAN)
	taxLabelNotice.clear()
})
afterEach(() => taxLabelNotice.clear())
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

const page = (scenario = ""): string => render(OverviewPage, { props: { scenario } }).body

/** The Demo with one plan, whose income is the fixture's: a labelled salary and an unlabelled pension. */
function saved(): Snapshot {
	const next = structuredClone(DEMO)
	next.params.scenarios = ["base"]
	next.reads.documents["base"] = documentRead()
	return next
}

describe("Home with no plan", () => {
	test("offers the guided first plan under the page's query", () => {
		const body = page()
		expect(body).toContain("Set up a first plan")
		expect(body).toContain('href="/plans/new/?demo=1"')
		expect(hostedWithSearch("/plans/new/", "?demo=1")).toBe("/demo/plans/new/?demo=1")
	})

	test("shows no first-plan entry while a plan exists", () => {
		replaceSnapshot(DEMO)
		expect(page("base")).not.toContain("Set up a first plan")
	})
})

describe("Home after a guided save", () => {
	test("points the new plan's income to its Tax labels, once", () => {
		replaceSnapshot(saved())
		taxLabelNotice.offer({ plan: "base", flow: "pension" })
		const body = page("base")
		expect(body).toContain("Next: give your income its tax labels in")
		expect(body).toContain('href="/settings/tax/?demo=1&amp;scenario=base"')
	})

	test("says nothing for another plan, or once that income has its label", () => {
		replaceSnapshot(saved())
		taxLabelNotice.offer({ plan: "retire-early", flow: "pension" })
		expect(page("base")).not.toContain("Next: give your income its tax labels in")

		const document = planDocument()
		const labelled = {
			...document,
			flows: document.flows.filter((flow) => flow.kind !== "income" || flow.id === "salary"),
		}
		const next = saved()
		next.reads.documents["base"] = documentRead(labelled)
		replaceSnapshot(next)
		taxLabelNotice.offer({ plan: "base", flow: "pension" })
		expect(page("base")).not.toContain("Next: give your income its tax labels in")
	})
})
