import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { HouseholdDocument, TaxProfile } from "../../lib/contract"
import { personNames } from "../../lib/view/item-names"
import { claimsTable } from "../../lib/view/tax-settings/claims"
import { flatClaimant } from "../../lib/view/tax-settings/flat-claims"
import TaxClaimsSection from "./TaxClaimsSection.svelte"

const PROFILE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	claimsHolder: "me",
	parents: 2,
	lifeInsurance: 15000,
	returns: {
		me: { children: 0, childrenAtHigherRate: 0, parents: 2, lifeInsurance: 15000 },
		partner: { children: 0, childrenAtHigherRate: 0, lifeInsurance: 12000 },
	},
}

/** A household that no longer names the recorded holder: "me" has gone, and "bob" is the partner. */
const GONE: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
		{ id: "bob", role: "partner", born: "1990-06", lifeExpectancy: 90 },
	],
	anchors: [],
	owners: [],
}

describe("the claims table after a holder swap", () => {
	test("names the earlier holder's column, never the raw id", () => {
		const people = personNames(GONE)
		const table = claimsTable(PROFILE, GONE, ["me", "partner"])
		if (table === null) throw new Error("the profile files separately")
		const body = render(TaxClaimsSection, {
			props: {
				table,
				people,
				claimant: flatClaimant(PROFILE, GONE, people),
				claimantId: "me",
			},
		}).body
		expect(body).toContain(">The earlier holder<")
		expect(body).not.toContain(">me<")
	})
})
