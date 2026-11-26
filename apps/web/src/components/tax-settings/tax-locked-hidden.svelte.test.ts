import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { HouseholdDocument, TaxProfile } from "../../lib/contract"
import { AMOUNT_MASK } from "../../lib/format"
import { personNames } from "../../lib/view/item-names"
import { draftOf } from "../../lib/view/tax-settings/draft"
import { flatClaimant, flatClaimParts } from "../../lib/view/tax-settings/flat-claims"
import { taxEdit } from "../../lib/view/tax-settings/profile-edit"
import TaxDrawer from "./TaxDrawer.svelte"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`

/** A separate filing whose home-loan interest was stored before the household swapped holder and partner. */
const PROFILE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	claimsHolder: "me",
	parents: 2,
	lifeInsurance: 15000,
	mortgageInterest: 14444,
}

/** The household after the swap, before `--from-stored`: "me" is the partner, and Owners make `shared=` claimable. */
const SWAPPED: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
		{ id: "me", role: "partner", born: "1990-06", lifeExpectancy: 90 },
	],
	anchors: [],
	owners: [{ path: "flows.salary", person: "partner" }],
}

const claimant = flatClaimant(PROFILE, SWAPPED, personNames(SWAPPED))

/** The Home drawer as the swapped page opens it: the flat fields wait, and the shared interest stays writable. */
const drawer = (): string => {
	if (claimant === null)
		throw new Error("the swapped household records the earlier holder's claims")
	return render(TaxDrawer, {
		props: {
			open: true,
			name: "base",
			contentHash: HASH,
			openedOn: HASH,
			profile: PROFILE,
			group: "home",
			unlabelled: [],
			flatClaimsLocked: true,
			flatClaimNote: flatClaimParts(claimant, "base"),
			onClose: () => {},
		},
	}).body
}

afterEach(() => {
	preferences.hidden = false
})

describe("a locked amount with Hide amounts on", () => {
	test("shows the mask and none of the stored digits, in its text or its accessible name", () => {
		preferences.hidden = true
		const body = drawer()
		expect(body).toContain(AMOUNT_MASK)
		expect(body).toContain("amount hidden")
		expect(body).toContain(">Home-loan interest</label>")
		expect(body).not.toContain("14,444")
		expect(body).not.toContain("14444")
		// The locked field takes no input; the shared interest is not a flat claim, so it keeps one.
		expect(body).not.toMatch(/<input[^>]*id="tax-mortgageInterest"/)
		expect(body).toMatch(/id="tax-mortgageInterest"/)
		expect(body).toMatch(/<input[^>]*id="tax-sharedMortgageInterest"/)
	})

	test("keeps the disabled input and its value while amounts are shown", () => {
		const body = drawer()
		expect(body).toMatch(/<input[^>]*id="tax-mortgageInterest"[^>]*disabled/)
		expect(body).toMatch(/<input[^>]*id="tax-mortgageInterest"[^>]*value="14444"/)
		expect(body).not.toContain(AMOUNT_MASK)
		expect(body).not.toContain("amount hidden")
	})

	test("a save from that drawer sends no flag for the locked field", () => {
		const origin = draftOf(PROFILE)
		const target = { name: "base", contentHash: HASH, origin }
		const draft = { ...origin, sharedMortgageInterest: "30000" }
		expect(taxEdit(target, draft, false)).toEqual({
			ok: true,
			edit: {
				kind: "merge-tax",
				name: "base",
				contentHash: HASH,
				flags: { sharedMortgageInterest: "30000" },
			},
		})
	})
})
