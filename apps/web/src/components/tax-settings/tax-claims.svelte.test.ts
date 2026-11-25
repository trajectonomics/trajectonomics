import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { HouseholdDocument, TaxProfile } from "../../lib/contract"
import { personNames } from "../../lib/view/item-names"
import { claimsTable } from "../../lib/view/tax-settings/claims"
import TaxClaimsSection from "./TaxClaimsSection.svelte"

const PROFILE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 1,
	childrenAtHigherRate: 0,
	lifeInsurance: 15000,
	claimsHolder: "me",
	returns: {
		me: { children: 1, childrenAtHigherRate: 0, lifeInsurance: 15000 },
		partner: { children: 1, childrenAtHigherRate: 0, parents: 2, lifeInsurance: 12000 },
	},
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

const PEOPLE = personNames(HOUSEHOLD)
const TABLE = claimsTable(PROFILE, ["me", "partner"])

function section(notes: readonly string[]): string {
	if (TABLE === null) throw new Error("the profile files separately")
	return render(TaxClaimsSection, { props: { table: TABLE, people: PEOPLE, notes } }).body
}

describe("the per-Return allowance view", () => {
	test("names each column by person and each cell by that Return's stored claim", () => {
		const body = section([])
		expect(body).toContain("Who claims each allowance")
		expect(body).toContain(">You<")
		expect(body).toContain(">Your partner<")
		expect(body).toContain("Parents you support")
		expect(body).toContain(">2<")
		expect(body).toContain("12,000 THB")
		expect(body).toContain(">None<")
	})

	test("states the CLI's shared home-loan assumption under the table when it states one", () => {
		const note = "Each separate Return's interest is taken to be on separate loans."
		expect(section([note])).toContain(note)
		expect(section([])).not.toContain("separate loans")
	})
})
