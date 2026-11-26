import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { HouseholdDocument, TaxProfile } from "../../lib/contract"
import { AMOUNT_MASK } from "../../lib/format"
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
const TABLE = claimsTable(PROFILE, HOUSEHOLD, ["me", "partner"])
const SHARED = claimsTable({ ...PROFILE, sharedMortgageInterest: 60000 }, HOUSEHOLD, [
	"me",
	"partner",
])

function rendered(table: typeof TABLE): string {
	if (table === null) throw new Error("the profile files separately")
	return render(TaxClaimsSection, { props: { table, people: PEOPLE } }).body
}

function section(): string {
	return rendered(TABLE)
}

afterEach(() => {
	preferences.hidden = false
})

/** A body without Svelte's comment markers: the text and markup a browser shows. */
const shown = (body: string): string => body.replace(/<!--.*?-->/gs, "")

describe("the per-Return allowance view", () => {
	test("names each column by person and each cell by that Return's stored claim", () => {
		const body = section()
		expect(body).toContain("Who claims each allowance")
		expect(body).toContain(">You<")
		expect(body).toContain(">Your partner<")
		expect(body).toContain("Parents you support")
		expect(body).toContain(">2<")
		expect(body).toContain("12,000 THB")
		expect(body).toContain(">None<")
	})

	test("states the stored shared home-loan interest the Returns share, or none", () => {
		expect(rendered(SHARED)).toContain(
			"Shared home-loan interest, half in a year both have income; otherwise the Return with income claims it all",
		)
		expect(rendered(SHARED)).toContain("60,000 THB")
		expect(section()).not.toContain("Shared home-loan interest")
	})

	test("masks every amount and the shared interest while amounts are hidden, and keeps the counts", () => {
		preferences.hidden = true
		const body = rendered(SHARED)
		expect(body).toContain(AMOUNT_MASK)
		expect(body).toContain("amount hidden")
		for (const amount of ["15,000", "12,000", "60,000"]) {
			expect(body).not.toContain(amount)
		}
		// The counts are not money: one child each and the partner's two parents still read as digits.
		expect(shown(body)).toContain(">1</td>")
		expect(shown(body)).toContain(">2</td>")
	})

	test("shows every figure as before while the switch is off", () => {
		const body = section()
		expect(body).toContain("15,000 THB")
		expect(body).not.toContain(AMOUNT_MASK)
		expect(body).not.toContain("amount hidden")
	})
})
