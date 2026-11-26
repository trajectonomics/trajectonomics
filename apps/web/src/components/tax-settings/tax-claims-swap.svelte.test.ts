import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { HouseholdDocument, Snapshot, TaxProfile } from "../../lib/contract"
import { personNames } from "../../lib/view/item-names"
import { claimsTable } from "../../lib/view/tax-settings/claims"
import { flatClaimant } from "../../lib/view/tax-settings/flat-claims"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import TaxClaimsSection from "./TaxClaimsSection.svelte"
import TaxSettingsBody from "./TaxSettingsBody.svelte"

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

	test("names a departed id that is not the recorded holder as another person, never the raw id", () => {
		// The holder "me" stays; the partner's id became "bob", so "partner" is an id the household no longer names.
		const renamed: HouseholdDocument = {
			...GONE,
			people: [
				{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
				{ id: "bob", role: "partner", born: "1992-02", lifeExpectancy: 88 },
			],
		}
		const people = personNames(renamed)
		const table = claimsTable(PROFILE, renamed, ["me", "partner"])
		if (table === null) throw new Error("the profile files separately")
		const body = render(TaxClaimsSection, {
			props: { table, people, claimant: flatClaimant(PROFILE, renamed, people), claimantId: "me" },
		}).body
		expect(body).toContain(">Another person<")
		expect(body).not.toContain(">partner<")
	})
})

describe("the CLI's departed-id note on the page", () => {
	test("calls the recorded holder the earlier holder, so the page passes the profile's claimsHolder", () => {
		const snapshot = structuredClone(DEMO) as Snapshot
		const read = snapshot.reads.documents["separate"]
		if (read?.ok !== true || read.data.scenario.tax == null)
			throw new Error("the Demo's separate plan states a profile")
		read.data.scenario.tax = { ...read.data.scenario.tax, claimsHolder: "gone" }
		const note = 'The claims stored for "gone", who is not in the household, are on no Return.'
		snapshot.reads.taxNotes = {
			...snapshot.reads.taxNotes,
			separate: {
				argv: ["scenario", "tax"],
				ok: true,
				data: { separateLoans: null, unclaimed: [note] },
			},
		}
		const body = render(TaxSettingsBody, {
			props: { snapshot, scenario: "separate", editable: false },
		}).body
		expect(body).toContain(
			"The claims stored for the earlier holder, who is not in the household, are on no Return.",
		)
		expect(body).not.toContain("another person, who is not in the household")
	})
})
