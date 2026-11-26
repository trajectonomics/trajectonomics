import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { HouseholdDocument, ScenarioShow, TaxProfile } from "../../lib/contract"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { blankDraft, draftOf, wholeDraftOf } from "../../lib/view/tax-settings/draft"
import { canClaimShared } from "../../lib/view/tax-settings/shared-plan"
import TaxDrawer from "./TaxDrawer.svelte"
import TaxProfileCard from "./TaxProfileCard.svelte"
import TaxProfileFields from "./TaxProfileFields.svelte"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`
const SEPARATE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	claimsHolder: "me",
	sharedMortgageInterest: 60000,
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

function show(
	profile: TaxProfile | null,
	taxed: boolean,
	levies: readonly unknown[],
): ScenarioShow["scenario"] {
	return {
		id: "id",
		name: "base",
		contentHash: HASH,
		forkedFrom: null,
		version: 1,
		createdAt: "2026-11-01T00:00:00Z",
		updatedAt: "2026-11-01T00:00:00Z",
		document: { ...planDocument(), levies: [...levies] },
		household: HOUSEHOLD,
		tax: profile,
		taxed,
		taxAllowances: { stated: [], notStated: [] },
	}
}

const card = (
	profile: TaxProfile | null,
	taxed: boolean,
	levies: readonly unknown[] = [{ id: "th-2026-pit@me" }],
): string =>
	render(TaxProfileCard, {
		props: { name: "base", show: show(profile, taxed, levies), editable: true },
	}).body

const drawer = (profile: TaxProfile, sharedClaimable: boolean): string =>
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

const fields = (draft: ReturnType<typeof blankDraft>, sharedClaimable = true): string =>
	render(TaxProfileFields, {
		props: { draft, shown: { at: () => undefined, general: undefined }, sharedClaimable },
	}).body

describe("what the plan says the form may claim", () => {
	test("a separate plan whose projection is refused is still claimed, and offers the field", () => {
		// No projection years: this is the card of a mid-year plan whose projection needs a carry-in.
		const body = card(SEPARATE, true)
		expect(body).toContain("60,000 THB")
		expect(body).not.toContain("kept, not claimed")
		expect(canClaimShared(HOUSEHOLD)).toBe(true)
		expect(drawer(SEPARATE, canClaimShared(HOUSEHOLD))).toContain('id="tax-sharedMortgageInterest"')
	})

	test("an untaxed plan whose first profile files separately offers the field", () => {
		const body = card(null, false, [])
		expect(body).toContain("Set the tax profile")
		const draft = { ...blankDraft(), filingStatus: "married_separate" }
		expect(fields(draft, canClaimShared(HOUSEHOLD))).toContain('id="tax-sharedMortgageInterest"')
	})

	test("a plan whose draft changes from joint to separate offers the field", () => {
		const draft = { ...draftOf(JOINT), filingStatus: "married_separate" }
		expect(fields(draft)).toContain('id="tax-sharedMortgageInterest"')
		expect(fields(draft)).toContain("half in a year both have income")
		expect(fields(draftOf(JOINT))).not.toContain('id="tax-sharedMortgageInterest"')
	})

	test("a joint plan that keeps a shared value fills it in when the whole draft files separately", () => {
		const kept = { ...JOINT, sharedMortgageInterest: 60000 }
		expect(card(kept, true, [{ id: "th-2026-pit" }])).toContain(
			"60,000 THB (kept, not claimed by this Return)",
		)
		const draft = { ...wholeDraftOf(kept, true), filingStatus: "married_separate" }
		expect(fields(draft)).toMatch(/id="tax-sharedMortgageInterest"[^>]*value="60000"/)
	})

	test("a household with no partner or Owners offers neither the field nor a filled-in value", () => {
		const draft = { ...wholeDraftOf(SEPARATE, false), filingStatus: "married_separate" }
		expect(fields(draft, false)).not.toContain('id="tax-sharedMortgageInterest"')
		expect(draft.sharedMortgageInterest).toBe("")
	})
})
