import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession } from "../../client/edit.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ProjectionAllowances, Snapshot } from "../../lib/contract"
import { allowancesView } from "../../lib/view/allowances"
import {
	GOLDEN_ALLOWANCES,
	withoutTarget,
	withSsf,
} from "../../lib/view/allowances/fixtures.test-support"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import { startWhatIf, switchedOff } from "../../lib/what-if/session"
import AllowancesBody from "./AllowancesBody.svelte"
import AllowancesResult from "./AllowancesResult.svelte"
import InputForm from "./InputForm.svelte"

const PLAN = {
	name: "base",
	contentHash: `jcs1:sha256:${"ab".repeat(32)}`,
	doc: { currency: "THB", flows: [], accounts: [] },
}
const result = (data: ProjectionAllowances, plan: typeof PLAN | null = null) =>
	render(AllowancesResult, { props: { data, plan, claimsHolder: null } }).body

/**
 * The Demo's `separate` plan with its Levy tallies made bare and both its per-Filer reads removed: the Filer plan
 * whose only Filer suffix is on a Flow's label, which the runner skips.
 */
function flowOnlyFilerPlan(): Snapshot {
	const stripped = structuredClone(DEMO)
	const stored = stripped.reads.documents["separate"]
	if (stored?.ok !== true) throw new Error("the Demo has no separate document")
	for (const levy of stored.data.scenario.document.levies ?? []) {
		const measures = (levy as { measures?: { label?: string }[] }).measures ?? []
		for (const measure of measures) {
			if (measure.label !== undefined) measure.label = measure.label.replace(/@(me|partner)$/, "")
		}
	}
	delete stripped.reads.allowances["separate"]
	delete stripped.reads.projections["separate"]
	return stripped
}

afterEach(() => {
	editSession.token = null
	editSession.error = null
	editSession.source = "form"
	whatIfSession.whatIf = null
})
afterAll(() => {
	preferences.hidden = false
})

describe("the result: this year first, then the later years", () => {
	test("this year states the tax due now, with every suggestion and the saving, then each allowance's extra and why it stopped", () => {
		const body = result(GOLDEN_ALLOWANCES)
		expect(body).toContain("This tax year")
		expect(body).toContain("28,400.00")
		expect(body).toContain("300.00")
		expect(body).toContain("28,100.00")
		expect(body).toContain("170,000.00")
		expect(body).toContain("ThaiESG")
		expect(body).toContain("No more is saved: the cap is reached or the tax stops falling.")
	})

	test("the later years are a table inside its own scroller, so the page does not scroll sideways", () => {
		const body = result(GOLDEN_ALLOWANCES)
		expect(body).toContain("Every later tax year")
		expect(body).toContain("1 Jan 2027 to 31 Dec 2027")
		expect(body).toContain("max-w-full overflow-auto")
	})

	test("the figures are estimates and the SSF line says its purchases are no longer deductible", () => {
		const body = result(GOLDEN_ALLOWANCES)
		expect(body.match(/not tax advice/g)).toHaveLength(1)
		const ssf = result(withSsf())
		expect(ssf).toContain("SSF purchases are no longer deductible from 2025.")
		expect(ssf).not.toContain("99,999.00")
	})

	test("Hide amounts masks every figure", () => {
		preferences.hidden = true
		const body = result(GOLDEN_ALLOWANCES)
		preferences.hidden = false
		expect(body).not.toContain("28,400.00")
		expect(body).not.toContain("170,000.00")
		expect(body).toContain("•••••")
	})
})

describe("the actions", () => {
	test("a page that cannot edit offers none", () => {
		const body = result(GOLDEN_ALLOWANCES)
		expect(body).not.toContain("Add to plan")
		expect(body).not.toContain("Try this year as a what-if")
	})

	test("an editable page offers Try as what-if and Add to plan for a year whose Flows have an Account", () => {
		const body = result(GOLDEN_ALLOWANCES, PLAN)
		expect(body).toContain("Try this year as a what-if")
		expect(body).toContain("Add to plan")
	})

	test("a suggestion with no Account is listed with its hint, and the year still offers the Flows that have one", () => {
		const body = result(withoutTarget(), PLAN)
		expect(body).toContain("Add to plan")
		expect(body).toContain("Add an asset Account for these as well")
		expect(body).toContain("/assets-and-debts/")
		expect(body).toContain("Pick the asset Account")
	})
})

describe("the page over the Demo snapshot", () => {
	const body = (snapshot: Snapshot, scenario = "base") =>
		render(AllowancesBody, { props: { snapshot, scenario } }).body

	test("a plan with a Levy shows the order, the step and the CLI's read", () => {
		const page = body(DEMO)
		expect(page).toContain("Your order")
		expect(page).toContain("RMF, then ThaiESG")
		expect(page).toContain("This tax year")
		expect(page).toContain("traj projection allowances")
	})

	test("the controls to change the order show only when the server answered", () => {
		expect(body(DEMO)).not.toContain("Read the allowances")
	})

	test("a plan with no Levy says so and gives the command that adds one", () => {
		const bare = structuredClone(DEMO)
		const read = bare.reads.documents["base"]
		if (read?.ok) delete read.data.scenario.document.levies
		const page = body(bare)
		expect(page).toContain("No Levy in this plan")
		expect(page).toContain("traj scenario tax base --tax th-2026")
	})

	test("a separate filing shows a section per Return, named by the household's role", () => {
		const page = body(DEMO, "separate")
		expect(page).toContain('aria-label="You"')
		expect(page).toContain('aria-label="Your partner"')
		expect(page.match(/aria-label="You: this tax year"/g)).toHaveLength(1)
		expect(page.match(/aria-label="Your partner: this tax year"/g)).toHaveLength(1)
		expect(page.match(/aria-label="You: every later tax year"/g)).toHaveLength(1)
		expect(page.match(/aria-label="Your partner: every later tax year"/g)).toHaveLength(1)
		expect(page).toContain("th-2026-pit@me")
		expect(page).toContain("th-2026-pit@partner")
		expect(page).not.toContain("Not read for a separate filing yet")
		expect(page).not.toContain("#635")
	})

	test("a Filer plan whose Levies tally no Filer label says why it has no read", () => {
		const page = body(flowOnlyFilerPlan(), "separate")
		expect(page).toContain("No Return to read")
		expect(page).toContain("no Levy of it tallies a Filer's label")
		expect(page).toContain("<code>traj scenario tax separate --from-stored</code>")
		expect(page).not.toContain("`traj")
		expect(page).not.toContain("Choose the allowances you could buy")
	})

	test("before the person chooses, no allowance is on and the page says nothing is read yet", () => {
		const fresh = structuredClone(DEMO)
		fresh.params.allowances = null
		fresh.reads.allowances = {}
		const page = body(fresh)
		expect(page).toContain("No allowances read yet")
		expect(page).not.toContain("checked")
	})
})

describe("the cards, the errors and the what-if of another plan", () => {
	test("the three figures of an allowance stack on a phone and sit side by side from the sm width", () => {
		const body = result(GOLDEN_ALLOWANCES)
		expect(body).toContain("grid-cols-1")
		expect(body).toContain("sm:grid-cols-3")
		expect(body).not.toMatch(/class="([^"]* )?grid-cols-3/)
	})

	test("an Edit's error shows once, at the control that sent it, and a read's error at the form", () => {
		const year = allowancesView(GOLDEN_ALLOWANCES).current?.key ?? ""
		editSession.error = "Another Edit is running."
		editSession.source = year
		expect(result(GOLDEN_ALLOWANCES, PLAN).match(/Another Edit is running/g)).toHaveLength(1)
		expect(render(InputForm, { props: { inputs: null } }).body).not.toContain("Another Edit")
		editSession.source = "form"
		expect(result(GOLDEN_ALLOWANCES, PLAN)).not.toContain("Another Edit")
		expect(render(InputForm, { props: { inputs: null } }).body).toContain("Another Edit")
	})

	test("Add to plan waits for a what-if of this plan only", () => {
		const open = (plan: string) => {
			whatIfSession.whatIf = switchedOff(startWhatIf(plan, PLAN.contentHash), "flows.gym")
		}
		const addDisabled = () =>
			/<button[^>]*\sdisabled(?:=""|\s|>)[^>]*>Add to plan/.test(result(GOLDEN_ALLOWANCES, PLAN))
		open("other")
		expect(addDisabled()).toBe(false)
		open("base")
		expect(addDisabled()).toBe(true)
		expect(result(GOLDEN_ALLOWANCES, PLAN)).toContain("Apply or revert the what-if first")
	})
})
