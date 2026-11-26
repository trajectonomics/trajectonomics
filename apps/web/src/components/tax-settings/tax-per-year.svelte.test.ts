import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type {
	HouseholdDocument,
	ProjectionRun,
	Read,
	TaxProfile,
	TaxYear,
} from "../../lib/contract"
import { projectionRun } from "../../lib/view/compare/projection.test-support"
import { type PersonNames, personNames } from "../../lib/view/item-names"
import { plainYear } from "../../lib/view/tax/brackets.test-support"
import { claimsTable } from "../../lib/view/tax-settings/claims"
import TaxClaimsSection from "./TaxClaimsSection.svelte"
import TaxPerYear from "./TaxPerYear.svelte"

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

/** The household both tables read: "me" holds and "partner" is the partner. */
const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [],
}

/** A household that no longer names the recorded holder: "me" has gone, and "bob" is the partner. */
const GONE: HouseholdDocument = {
	...HOUSEHOLD,
	people: [
		{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
		{ id: "bob", role: "partner", born: "1990-06", lifeExpectancy: 90 },
	],
}

/** A household that names the recorded holder but no longer names the partner's old id. */
const RENAMED: HouseholdDocument = {
	...HOUSEHOLD,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "bob", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
}

const FILERS = ["me", "partner"] as const

/** One tax year per Filer, so the per-year table's Return column names each Return. */
const YEARS: readonly TaxYear[] = FILERS.map((filer) =>
	plainYear({ levy: `th-2026-pit@${filer}`, filer }),
)

function perYear(people: PersonNames, claimsHolder: string | null): string {
	const read: Read<ProjectionRun> = {
		argv: ["projection", "run", "base", "--json"],
		ok: true,
		data: projectionRun({ taxYears: [...YEARS] }),
	}
	return render(TaxPerYear, {
		props: { name: "base", read, people, claimsHolder },
	}).body
}

function claims(
	household: HouseholdDocument | null,
	people: PersonNames,
	claimsHolder: string | null,
): string {
	const table = claimsTable(PROFILE, household, [...FILERS])
	if (table === null) throw new Error("the profile files separately")
	return render(TaxClaimsSection, { props: { table, people, claimsHolder } }).body
}

/** What a browser shows of a fragment: its text, without Svelte's comments or the tags around it. */
function words(html: string): string {
	return html
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<[^>]+>/g, "")
		.trim()
}

/** The Return column of each per-year row, in the CLI's order. */
function perYearReturns(body: string): string[] {
	return [...body.matchAll(/<tr class="[^"]*">([\s\S]*?)<\/tr>/g)].flatMap((row) => {
		const cell = (row[1] ?? "").match(/<td[^>]*>([\s\S]*?)<\/td>/)
		return cell === null ? [] : [words(cell[1] ?? "")]
	})
}

/** The person columns of the claims table, in the CLI's order. */
function claimColumns(body: string): string[] {
	return [...body.matchAll(/<th scope="col" class="[^"]*text-right[^"]*">([\s\S]*?)<\/th>/g)].map(
		(column) => words(column[1] ?? ""),
	)
}

describe("the per-year Return column names a person as the claims table does", () => {
	test("by the household's words for a person it names", () => {
		const people = personNames(HOUSEHOLD)
		const rows = perYear(people, "me")
		expect(perYearReturns(rows)).toEqual(["You", "Your partner"])
		expect(claimColumns(claims(HOUSEHOLD, people, "me"))).toEqual(["You", "Your partner"])
		expect(rows).not.toContain("data-unnamed")
	})

	test("as the earlier holder for the recorded holder the household no longer names", () => {
		const people = personNames(GONE)
		const rows = perYear(people, "me")
		expect(perYearReturns(rows)).toEqual(["The earlier holder", "You"])
		expect(claimColumns(claims(GONE, people, "me"))).toEqual(["The earlier holder", "You"])
		expect(rows).not.toContain("data-unnamed")
	})

	test("as another person for any other id the household no longer names", () => {
		const people = personNames(RENAMED)
		const rows = perYear(people, "me")
		expect(perYearReturns(rows)).toEqual(["You", "Another person"])
		expect(claimColumns(claims(RENAMED, people, "me"))).toEqual(["You", "Another person"])
		expect(rows).not.toContain("data-unnamed")
	})

	test("by its id, in code, with no household at all", () => {
		const people = personNames(null)
		const rows = perYear(people, "me")
		const columns = claims(null, people, "me")
		expect(perYearReturns(rows)).toEqual(["me", "partner"])
		expect(claimColumns(columns)).toEqual(["me", "partner"])
		expect(rows).toMatch(/<code[^>]*data-unnamed[^>]*>me<\/code>/)
		expect(columns).toMatch(/<code[^>]*data-unnamed[^>]*>partner<\/code>/)
	})
})
