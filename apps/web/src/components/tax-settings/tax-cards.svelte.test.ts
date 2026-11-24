import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession } from "../../client/edit.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { fakeServer, HASH, useSessionHooks } from "../../client/what-if.test-support"
import type { ScenarioDocument, ScenarioShow, TaxProfile } from "../../lib/contract"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import TaxDrawer from "./TaxDrawer.svelte"
import TaxLabelForm from "./TaxLabelForm.svelte"
import TaxProfileCard from "./TaxProfileCard.svelte"
import TaxSettingsBody from "./TaxSettingsBody.svelte"

useSessionHooks()
afterEach(() => {
	editSession.clear()
})

const profile: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_joint",
	children: 2,
	childrenAtHigherRate: 1,
	lifeInsurance: 20000,
}

function labelled(): ScenarioDocument {
	const plan = planDocument()
	return {
		...plan,
		flows: plan.flows.map((flow) =>
			flow.kind === "income" ? { ...flow, label: "income.section40_1" } : flow,
		),
	}
}

const show = (document: ScenarioDocument): ScenarioShow["scenario"] => ({
	id: "id",
	name: "base",
	contentHash: HASH,
	forkedFrom: null,
	version: 1,
	createdAt: "2026-11-01T00:00:00Z",
	updatedAt: "2026-11-01T00:00:00Z",
	document,
	household: null,
	tax: profile,
	taxed: true,
})
const card = () =>
	render(TaxProfileCard, { props: { name: "base", show: show(labelled()), editable: true } }).body

describe("the grouped cards", () => {
	test("each group is a card with its own Edit, and the figures are the stored profile's", () => {
		const body = card()
		for (const title of [
			"Filing status",
			"Family",
			"Insurance",
			"Home",
			"Giving",
			"Social security",
		]) {
			expect(body).toContain(`aria-label="${title}"`)
			expect(body).toMatch(new RegExp(`<button[^>]*>\\s*Edit ${title.toLowerCase()}\\s*</button>`))
		}
		expect(body).toContain("20,000 THB")
		expect(body).toContain("Married, filing jointly")
	})

	test("lists what is not in the plan yet under the cards, each opening a drawer, and a contribution class links out", () => {
		const body = card()
		expect(body).toContain("Not in your plan yet")
		expect(body).toMatch(/<button[^>]*>\s*Parents you support\s*<\/button>/)
		expect(body).toMatch(/<button[^>]*>\s*Home-loan interest\s*<\/button>/)
		expect(body).not.toMatch(/<button[^>]*>\s*Life insurance premiums\s*<\/button>/)
		expect(body).toContain('href="/optimize/allowances/"')
		expect(body).toContain("ThaiESG contributions")
		expect(body.indexOf("Not in your plan yet")).toBeGreaterThan(
			body.indexOf("Edit social security"),
		)
	})

	test("fits a phone: one column that becomes two from a tablet, no fixed width, and a drawer as wide as the screen", () => {
		const body = card()
		expect(body).toContain("grid grid-cols-1 gap-4 sm:grid-cols-2")
		expect(body).not.toContain("min-w-[")
		expect(body).not.toMatch(/ w-\[/)
		const drawer = render(TaxDrawer, {
			props: {
				open: true,
				name: "base",
				contentHash: HASH,
				openedOn: HASH,
				profile,
				group: "insurance",
				unlabelled: [],
				onClose: () => {},
			},
		}).body
		expect(drawer).toContain("w-full max-w-full")
		expect(drawer).toContain("Edit insurance")
		expect(drawer).toContain('id="tax-lifeInsurance"')
		expect(drawer).toContain('id="tax-spouseLifeInsurance"')
	})

	test("the drawer of a group shows that group's items only", () => {
		const drawer = render(TaxDrawer, {
			props: {
				open: true,
				name: "base",
				contentHash: HASH,
				openedOn: HASH,
				profile,
				group: "family",
				unlabelled: [],
				onClose: () => {},
			},
		}).body
		for (const shown of ["children", "childrenAtHigherRate", "parents", "disabledCare"]) {
			expect(drawer).toContain(`id="tax-${shown}"`)
		}
		expect(drawer).not.toContain('id="tax-lifeInsurance"')
		expect(drawer).not.toContain('id="tax-filing-status"')
		expect(drawer).toContain("State the whole profile instead")
	})
})

describe("inside a What-if session", () => {
	test("the Edit buttons wait, and a sentence says tax settings are saved, not tried", () => {
		fakeServer()
		const quiet = card()
		expect(quiet).not.toContain("saved, not tried")
		expect(quiet).not.toMatch(/<button[^>]*\sdisabled=""[^>]*>\s*Edit family/)
		whatIfSession.tryChange("base", HASH, (base) => base)
		whatIfSession.setOff("base", HASH, "flows.rent", true)
		const body = card()
		expect(body).toContain("Tax settings are saved, not tried")
		expect(body).toMatch(/<button[^>]*\sdisabled=""[^>]*>\s*Edit family\s*<\/button>/)
		expect(body).toMatch(/<button[^>]*\sdisabled=""[^>]*>\s*Parents you support\s*<\/button>/)
		expect(body).toMatch(/<button[^>]*\sdisabled=""[^>]*>\s*Remove tax\s*<\/button>/)
	})

	test("a session of another plan changes nothing here", () => {
		fakeServer()
		whatIfSession.tryChange("retire-early", HASH, (base) => base)
		whatIfSession.setOff("retire-early", HASH, "flows.rent", true)
		expect(card()).not.toContain("saved, not tried")
	})
})

describe("the tax per year", () => {
	const body = (name: string) =>
		render(TaxSettingsBody, { props: { snapshot: DEMO, scenario: name, editable: false } }).body

	test("shows the plan's own tax years from its projection read, under the cards", () => {
		const text = body("base")
		expect(text).toContain("Tax per year of base")
		expect(text).toContain("Tax per year, figures in THB")
		expect(text.indexOf("Tax per year of base")).toBeGreaterThan(
			text.indexOf("Tax profile of base"),
		)
		const run = DEMO.reads.projections["base"]
		if (run === undefined || !run.ok) throw new Error("the Demo has a projection")
		const first = run.data.taxYears[0]
		if (first === undefined) throw new Error("the Demo is taxed")
		expect(text).toContain(first.owed.replace(/\B(?=(\d{3})+(?!\d))/g, ","))
	})

	test("a plan with no tax years says its figures are before tax", () => {
		const text = body("retire-early")
		expect(text).toContain("Tax per year of retire-early")
	})
})

describe("the tax label form", () => {
	const form = () =>
		render(TaxLabelForm, { props: { name: "base", show: show(planDocument()), disabled: false } })
			.body

	test("names the income Flows with no label and offers the income labels only", () => {
		const body = form()
		expect(body).toContain("Tax labels")
		expect(body).toContain('value="pension"')
		expect(body).toContain('value="tax-refund"')
		expect(body).not.toContain('value="salary"')
		expect(body).not.toContain('value="rent"')
		expect(body).toContain('value="income.section40_1"')
		expect(body).not.toContain("allowance.retirement")
		expect(body).toContain("Choose a tax label")
	})

	test("waits while an Edit runs or a What-if session is open", () => {
		const body = render(TaxLabelForm, {
			props: { name: "base", show: show(planDocument()), disabled: true },
		}).body
		expect(body).toMatch(/<button[^>]*\sdisabled=""[^>]*>\s*Save the tax label/)
	})
})
