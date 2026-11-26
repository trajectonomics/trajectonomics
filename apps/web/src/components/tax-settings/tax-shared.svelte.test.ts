import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { HouseholdDocument, ScenarioShow, TaxProfile } from "../../lib/contract"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import TaxDrawer from "./TaxDrawer.svelte"
import TaxProfileCard from "./TaxProfileCard.svelte"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`

const SEPARATE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	claimsHolder: "me",
	sharedMortgageInterest: 60000,
	parents: 2,
	healthInsurance: 15000,
}

const JOINT: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_joint",
	children: 0,
	childrenAtHigherRate: 0,
}

const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [],
}

/** The same two people after the household swapped holder and partner, before `--from-stored` ran. */
const SWAPPED: HouseholdDocument = {
	...HOUSEHOLD,
	people: [
		{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
		{ id: "me", role: "partner", born: "1990-06", lifeExpectancy: 90 },
	],
}

function show(profile: TaxProfile, household: HouseholdDocument | null): ScenarioShow["scenario"] {
	return {
		id: "id",
		name: "base",
		contentHash: HASH,
		forkedFrom: null,
		version: 1,
		createdAt: "2026-11-01T00:00:00Z",
		updatedAt: "2026-11-01T00:00:00Z",
		document: planDocument(),
		household,
		tax: profile,
		taxed: true,
		taxAllowances: { stated: [], notStated: [] },
	}
}

const card = (profile: TaxProfile, household: HouseholdDocument | null): string =>
	render(TaxProfileCard, {
		props: { name: "base", show: show(profile, household), editable: true },
	}).body

const drawer = (profile: TaxProfile): string =>
	render(TaxDrawer, {
		props: {
			open: true,
			name: "base",
			contentHash: HASH,
			openedOn: HASH,
			profile,
			group: "home",
			unlabelled: [],
			onClose: () => {},
		},
	}).body

describe("the shared home-loan interest", () => {
	test("the Home card shows the stored interest beside each Return's own", () => {
		const body = card(SEPARATE, HOUSEHOLD)
		expect(body).toContain("Shared home-loan interest")
		expect(body).toContain("60,000 THB")
		expect(body).toContain("Home-loan interest")
	})

	test("the form offers the field on a separate filing only", () => {
		expect(drawer(SEPARATE)).toContain('id="tax-sharedMortgageInterest"')
		expect(drawer(SEPARATE)).toContain("Shared home-loan interest")
		expect(drawer(JOINT)).not.toContain('id="tax-sharedMortgageInterest"')
	})
})

describe("the cards after a holder swap", () => {
	test("name the claimsHolder, not the person who is now the holder", () => {
		const body = card(SEPARATE, SWAPPED)
		expect(body).toContain("Parents your partner supports")
		expect(body).toMatch(/Your partner(?:&#39;|')s health insurance premiums/)
		expect(body).not.toContain("Parents you support")
		expect(body).not.toContain("Your health insurance premiums")
	})

	test("keep saying you while the flat keys are the holder's own", () => {
		const body = card(SEPARATE, HOUSEHOLD)
		expect(body).toContain("Parents you support")
		expect(body).toContain("Your health insurance premiums")
	})
})
