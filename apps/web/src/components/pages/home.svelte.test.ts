import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { taxLabelNotice } from "../../client/tax-label-notice.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { documentRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { LOADING } from "../../lib/view/state"
import { withFlowLabel } from "../../lib/view/tax-settings/label-edit"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import PlanItemsBody from "../plan-items/PlanItemsBody.svelte"
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

/** The Demo with one plan, whose income is the fixture's: a labelled salary and an unlabelled pension and refund. */
function saved(): Snapshot {
	const next = structuredClone(DEMO)
	next.params.scenarios = ["base"]
	next.reads.documents["base"] = documentRead()
	return next
}

describe("Home with no plan", () => {
	test("keeps the Net worth and Accounts cards, and offers the guided first plan as its one action", () => {
		const body = page()
		expect(body).toContain('href="/net-worth/?demo=1"')
		expect(body).toContain('href="/assets-and-debts/?demo=1"')
		expect(body).toContain("data-primary-action")
		expect(body).toContain('href="/plans/new/?demo=1"')
		expect(body).toContain("Set up a first plan")
	})

	test("shows no first-plan action while a plan exists", () => {
		replaceSnapshot(DEMO)
		expect(page("base")).not.toContain("Set up a first plan")
	})
})

describe("Home after a guided save", () => {
	test("points the new plan's income to its Tax labels, once, below the answer", () => {
		replaceSnapshot(saved())
		taxLabelNotice.offer({ plan: "base", flow: "pension", origin: "guided", taxed: true })
		const body = page("base")
		expect(body).toContain('role="status"')
		expect(body).toContain("Next: give your income its tax labels in")
		expect(body).toContain('href="/settings/tax/?demo=1&amp;scenario=base"')
		const answer = body.indexOf("data-focus-section")
		expect(answer).toBeGreaterThan(-1)
		expect(answer).toBeLessThan(body.indexOf("Next:"))
		expect(body.indexOf("Next:")).toBeLessThan(body.indexOf("Your summary"))
	})

	test("keeps the status region mounted when no save offered a step", () => {
		replaceSnapshot(saved())
		const body = page("base")
		expect(body).toContain('role="status"')
		expect(body).not.toContain("Next:")
	})

	test("sets up the tax profile first when the plan has none", () => {
		const untaxed = planDocument()
		delete untaxed.levies
		const next = saved()
		next.reads.documents["base"] = documentRead(untaxed)
		replaceSnapshot(next)
		taxLabelNotice.offer({ plan: "base", flow: "pension", origin: "guided", taxed: false })
		const body = page("base")
		expect(body).toContain("Next: set up tax in")
		expect(body).toContain("Tax profile")
		expect(body).not.toContain("give your income its tax labels")
	})

	test("keeps the step while any other income still has no label", () => {
		const labelled = withFlowLabel(planDocument(), "pension", "income.section40_1")
		const next = saved()
		next.reads.documents["base"] = documentRead(labelled)
		replaceSnapshot(next)
		taxLabelNotice.offer({ plan: "base", flow: "pension", origin: "guided", taxed: true })
		expect(page("base")).toContain("Next: give your income its tax labels in")
	})

	test("says nothing for another plan, or once every income has its label", () => {
		replaceSnapshot(saved())
		taxLabelNotice.offer({ plan: "retire-early", flow: "pension", origin: "guided", taxed: true })
		expect(page("base")).not.toContain("Next: give your income its tax labels in")

		const document = planDocument()
		const labelled = {
			...document,
			flows: document.flows.filter((flow) => flow.kind !== "income" || flow.id === "salary"),
		}
		const next = saved()
		next.reads.documents["base"] = documentRead(labelled)
		replaceSnapshot(next)
		taxLabelNotice.offer({ plan: "base", flow: "pension", origin: "guided", taxed: true })
		expect(page("base")).not.toContain("Next: give your income its tax labels in")
	})

	test("keeps the drawer's offer off Home", () => {
		replaceSnapshot(saved())
		taxLabelNotice.offer({ plan: "base", flow: "pension", origin: "drawer", taxed: true })
		expect(page("base")).toContain('role="status"')
		expect(page("base")).not.toContain("give your income its tax labels")
	})

	test("keeps the guided step off the Income page, which shows only a drawer's note", () => {
		replaceSnapshot(saved())
		taxLabelNotice.offer({ plan: "base", flow: "pension", origin: "guided", taxed: true })
		const body = render(PlanItemsBody, {
			props: { snapshot: saved(), kind: "income", scenario: "base", editable: false },
		}).body
		expect(body).not.toContain("Give this income a label in")
	})
})

describe("Home's greeting", () => {
	test("heads the page with the greeting and draws the hello mascot beside it", () => {
		const body = page()
		expect(body).toContain("<h1")
		expect(body).toContain("Hello there, this is your current situation")
		expect(body).toContain("data-overview-mascot")
		expect(body).toContain('src="/mascot/hello.webp"')
		expect(body).toContain('alt=""')
		expect(body).toContain('aria-hidden="true"')
		expect(body).toContain("print:hidden")
	})

	test("names the holder the main plan's household states", () => {
		const next = structuredClone(DEMO)
		const list = next.reads.scenarios
		if (!list.ok) throw new Error("the Demo lists its plans")
		const base = list.data.scenarios.find((plan) => plan.name === "base")
		if (base === undefined) throw new Error("the Demo has base")
		base.main = true
		const read = next.reads.documents["base"]
		if (read === undefined || !read.ok) throw new Error("the Demo reads base")
		const holder = read.data.scenario.household?.people.find((person) => person.role === "holder")
		if (holder === undefined) throw new Error("the Demo's base has a holder")
		holder.displayLabel = "Ao"
		replaceSnapshot(next)
		expect(page("base")).toContain("Hello Ao, this is your current situation")
	})
})
