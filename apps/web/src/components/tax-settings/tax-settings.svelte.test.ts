import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { ScenarioDocument, ScenarioShow, TaxProfile } from "../../lib/contract"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { blankDraft } from "../../lib/view/tax-settings/draft"
import TaxProfileCard from "./TaxProfileCard.svelte"
import TaxProfileFields from "./TaxProfileFields.svelte"
import TaxProfileForm from "./TaxProfileForm.svelte"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`
const profile: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_joint",
	children: 2,
	childrenAtHigherRate: 1,
	lifeInsurance: 20000,
}

/** The fixture plan with a tax label on every income Flow, so the form is offered. */
function labelledPlan(): ScenarioDocument {
	const plan = planDocument()
	const flows = plan.flows.map((flow) =>
		flow.kind === "income" ? { ...flow, label: "income.section40_1" } : flow,
	)
	return { ...plan, flows }
}

function show(extra: { tax?: TaxProfile | null; taxed?: boolean }): ScenarioShow["scenario"] {
	return {
		id: "id",
		name: "base",
		contentHash: HASH,
		forkedFrom: null,
		version: 1,
		createdAt: "2026-11-01T00:00:00Z",
		updatedAt: "2026-11-01T00:00:00Z",
		document: labelledPlan(),
		household: null,
		...extra,
	}
}

function card(extra: { tax?: TaxProfile | null; taxed?: boolean }, editable = true): string {
	return render(TaxProfileCard, { props: { name: "base", show: show(extra), editable } }).body
}

describe("the tax profile card", () => {
	test("says whose tax it is, for which year, and that SSF is not deductible from 2025", () => {
		const body = card({ tax: profile, taxed: true })
		expect(body).toContain("Thai personal income tax for the 2026 tax year")
		expect(body).toContain("SSF is not deductible from 2025")
	})

	test("shows the stored profile as stored, with the controls to change and remove it", () => {
		const body = card({ tax: profile, taxed: true })
		expect(body).toContain("Married, filing jointly")
		expect(body).toContain("20,000 THB")
		expect(body).toMatch(/<button[^>]*>\s*Change the tax profile\s*<\/button>/)
		expect(body).toMatch(/<button[^>]*>\s*Remove tax\s*<\/button>/)
	})

	test("a plan with no profile and no Levy is not taxed: nothing is shown, and no Remove", () => {
		const body = card({ tax: null, taxed: false })
		expect(body).toContain("Plan base is not taxed")
		expect(body).toMatch(/<button[^>]*>\s*Set the tax profile\s*<\/button>/)
		expect(body).not.toContain("Remove tax")
		expect(body).not.toContain("Married")
	})

	test("a plan taxed with no stored profile says so, and offers to set it whole", () => {
		const body = card({ tax: null, taxed: true })
		expect(body).toContain("its tax profile is not stored")
		expect(body).toMatch(/<button[^>]*>\s*Set the tax profile\s*<\/button>/)
		expect(body).toContain("Remove tax")
	})

	test("a Snapshot saved before profiles were kept reads taxed from the document's Levies", () => {
		const document = { ...labelledPlan(), levies: [{ id: "th-2026-pit" }] }
		const old = { ...show({}), document }
		const body = render(TaxProfileCard, {
			props: { name: "base", show: old, editable: false },
		}).body
		expect(body).toContain("its tax profile is not stored")
	})

	test("a plan with an income Flow that has no tax label names it and the command, and offers no form", () => {
		const unlabelled = { ...show({ tax: null, taxed: false }), document: planDocument() }
		const body = render(TaxProfileCard, {
			props: { name: "base", show: unlabelled, editable: true },
		}).body
		expect(body).toContain("pension, tax-refund")
		expect(body).toContain("traj scenario tax base --tax th-2026 --label &lt;flow>=&lt;label>")
		expect(body).not.toMatch(/<button[^>]*>\s*Set the tax profile/)
		expect(body).not.toContain("Remove tax")
	})

	test("a taxed plan with an unlabelled income Flow offers Remove, whose confirmation names the command", () => {
		const unlabelled = { ...show({ tax: profile, taxed: true }), document: planDocument() }
		const body = render(TaxProfileCard, {
			props: { name: "base", show: unlabelled, editable: true },
		}).body
		expect(body).toContain("traj scenario tax base --merge --label")
		expect(body).not.toMatch(/<button[^>]*>\s*Change the tax profile/)
		expect(body).toMatch(/<button[^>]*>\s*Remove tax\s*<\/button>/)
	})

	test("shows no controls when the server does not answer Edits", () => {
		const body = card({ tax: profile, taxed: true }, false)
		expect(body).toContain("Married, filing jointly")
		expect(body).not.toContain("Change the tax profile")
		expect(body).not.toContain("Remove tax")
	})
})

describe("the tax profile form", () => {
	const form = (stored: TaxProfile | null) =>
		render(TaxProfileForm, {
			props: { name: "base", contentHash: HASH, profile: stored, onDone: () => {} },
		}).body

	test("a stored profile fills each field as stored, and offers to state it whole", () => {
		const body = form(profile)
		expect(body).toContain("every other item of the stored profile stays")
		expect(body).toMatch(/id="tax-lifeInsurance"[^>]*value="20000"/)
		expect(body).toMatch(/id="tax-children"[^>]*inputmode="numeric"/)
		expect(body).toMatch(/id="tax-lifeInsurance"[^>]*inputmode="decimal"/)
		expect(body).toContain("State the whole profile instead")
	})

	test("a plan with no profile starts with nothing filled in and asks for the filing status", () => {
		const body = form(null)
		expect(body).toContain("Nothing is filled in for you")
		expect(body).not.toMatch(/id="tax-children"[^>]*value="[^"]/)
		expect(body).toContain("Choose a filing status")
		expect(body).not.toContain("instead")
	})

	test("every item of the profile has a field", () => {
		const draft = blankDraft()
		const body = render(TaxProfileFields, {
			props: { draft, shown: { at: () => undefined, general: undefined } },
		}).body
		for (const key of [
			"children",
			"childrenAtHigherRate",
			"parents",
			"disabledCare",
			"socialSecurity",
			"lifeInsurance",
			"healthInsurance",
			"parentHealthInsurance",
			"spouseLifeInsurance",
			"mortgageInterest",
			"donation2x",
			"donation1x",
		]) {
			expect(body).toContain(`id="tax-${key}"`)
		}
	})
})
