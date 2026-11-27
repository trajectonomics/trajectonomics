import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { HouseholdDocument, ScenarioShow, TaxProfile, TaxYear } from "../../lib/contract"
import { householdHashOf } from "../../lib/contract/household-hash.test-support"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { plainYear } from "../../lib/view/tax/brackets.test-support"
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
	owners: [{ path: "flows.salary", person: "me" }],
}

/** The same two people after the household swapped holder and partner, before `--from-stored` ran. */
const SWAPPED: HouseholdDocument = {
	...HOUSEHOLD,
	people: [
		{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
		{ id: "me", role: "partner", born: "1990-06", lifeExpectancy: 90 },
	],
}

function show(
	profile: TaxProfile,
	household: HouseholdDocument | null,
	levies: readonly unknown[] = [{ id: "th-2026-pit" }],
): ScenarioShow["scenario"] {
	return {
		id: "id",
		name: "base",
		contentHash: HASH,
		householdHash: householdHashOf(HASH),
		forkedFrom: null,
		version: 1,
		createdAt: "2026-11-01T00:00:00Z",
		updatedAt: "2026-11-01T00:00:00Z",
		document: { ...planDocument(), levies: [...levies] },
		household,
		tax: profile,
		taxed: true,
		taxAllowances: { stated: [], notStated: [] },
	}
}

const FILERS: readonly TaxYear[] = [
	plainYear({ filer: "me", levy: "th-2026-pit@me" }),
	plainYear({ filer: "partner", levy: "th-2026-pit@partner" }),
]

const card = (
	profile: TaxProfile,
	household: HouseholdDocument | null,
	years: readonly TaxYear[] = [],
	levies: readonly unknown[] = [{ id: "th-2026-pit" }],
): string =>
	render(TaxProfileCard, {
		props: { name: "base", show: show(profile, household, levies), editable: true, years },
	}).body

const drawer = (profile: TaxProfile, sharedClaimable = true): string =>
	render(TaxDrawer, {
		props: {
			open: true,
			name: "base",
			contentHash: HASH,
			openedOn: HASH,
			profile,
			group: "home",
			unlabelled: [],
			sharedClaimable,
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

	test("the form offers no field when the household has no partner or Owners", () => {
		expect(drawer(SEPARATE, false)).not.toContain('id="tax-sharedMortgageInterest"')
	})

	test("the Home card says a stored value a Return does not claim is kept and not claimed", () => {
		const joint = { ...JOINT, sharedMortgageInterest: 60000 }
		// A joint filing writes one Levy without a Filer, so no Return claims it, whatever the projection says.
		expect(card(joint, HOUSEHOLD, FILERS, [{ id: "th-2026-pit" }])).toContain(
			"60,000 THB (kept, not claimed by this Return)",
		)
		// A separate profile whose document has no Levy id naming a Filer claims none either.
		expect(card(SEPARATE, HOUSEHOLD, FILERS, [{ id: "th-2026-pit" }])).toContain(
			"60,000 THB (kept, not claimed by this Return)",
		)
		// A separate Return's Levy names its Filer (`th-2026-pit@me`), and the projection is not what decides it.
		expect(card(SEPARATE, HOUSEHOLD, [], [{ id: "th-2026-pit@me" }])).toContain("60,000 THB")
		expect(card(SEPARATE, HOUSEHOLD, [], [{ id: "th-2026-pit@me" }])).not.toContain(
			"kept, not claimed",
		)
		expect(card(SEPARATE, HOUSEHOLD, FILERS, [{ id: "th-2026-pit@me" }])).not.toContain(
			"kept, not claimed",
		)
	})

	test("the Home card has no shared row on a joint plan that stores none", () => {
		expect(card(JOINT, HOUSEHOLD, FILERS)).not.toContain("Shared home-loan interest")
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

	test("say you for a joint or single filing, whose flat keys are that Return's own", () => {
		for (const filingStatus of ["married_joint", "single"] as const) {
			const body = card({ ...SEPARATE, filingStatus }, SWAPPED)
			expect(body).toContain("Parents you support")
			expect(body).toContain("Your health insurance premiums")
			expect(body).not.toContain("Parents your partner supports")
		}
	})

	test("say you after --from-stored moved the record to the new holder", () => {
		const body = card({ ...SEPARATE, claimsHolder: "partner" }, SWAPPED)
		expect(body).toContain("Parents you support")
		expect(body).toContain("Your health insurance premiums")
	})

	test("call a recorded holder the household no longer names the earlier holder", () => {
		const body = card({ ...SEPARATE, claimsHolder: "gone" }, HOUSEHOLD)
		expect(body).toContain("Parents the earlier holder supports")
		expect(body).toMatch(/The earlier holder(?:&#39;|')s health insurance premiums/)
		expect(body).not.toContain("Parents gone supports")
	})

	test("say you with no household, never an id", () => {
		const body = card(SEPARATE, null)
		expect(body).toContain("Parents you support")
		expect(body).toContain("Your health insurance premiums")
		expect(body).not.toContain("Parents me supports")
	})
})
