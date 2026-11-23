import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession } from "../../client/edit.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionAllowances, Snapshot } from "../../lib/contract"
import {
	GOLDEN_ALLOWANCES,
	withoutTarget,
	withSsf,
} from "../../lib/view/allowances/fixtures.test-support"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import AllowancesBody from "./AllowancesBody.svelte"
import AllowancesResult from "./AllowancesResult.svelte"

const PLAN = {
	name: "base",
	contentHash: `jcs1:sha256:${"ab".repeat(32)}`,
	doc: { currency: "THB", flows: [], accounts: [] },
}
const result = (data: ProjectionAllowances, plan: typeof PLAN | null = null) =>
	render(AllowancesResult, { props: { data, plan } }).body

afterEach(() => {
	editSession.token = null
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
		expect(result(GOLDEN_ALLOWANCES)).toContain(
			"estimates from this plan's own tax rules, not tax advice",
		)
		const body = result(withSsf())
		expect(body).toContain("SSF purchases are no longer deductible from 2025.")
		expect(body).not.toContain("99,999.00")
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

	test("a suggestion with no Account says which to add first and links to Assets and debts", () => {
		const body = result(withoutTarget(), PLAN)
		expect(body).not.toContain("Add to plan")
		expect(body).toContain("Add an asset Account for these first")
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

	test("before the person chooses, no allowance is on and the page says nothing is read yet", () => {
		const fresh = structuredClone(DEMO)
		fresh.params.allowances = null
		fresh.reads.allowances = {}
		const page = body(fresh)
		expect(page).toContain("No allowances read yet")
		expect(page).not.toContain("checked")
	})
})
