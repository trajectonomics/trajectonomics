import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { HouseholdDocument, ProjectionAllowances, Snapshot } from "../../lib/contract"
import { GOLDEN_ALLOWANCES } from "../../lib/view/allowances/fixtures.test-support"
import { type PersonNames, personNames } from "../../lib/view/item-names"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import AllowancesBody from "./AllowancesBody.svelte"
import AllowancesResult from "./AllowancesResult.svelte"

/** A household whose "me" has gone: the old partner now holds, and "bob" is the partner. */
const GONE: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
		{ id: "bob", role: "partner", born: "1990-06", lifeExpectancy: 90 },
	],
	anchors: [],
	owners: [],
}

/** A household that names the holder but no longer names the partner's old id. */
const RENAMED: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "bob", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [],
}

/** A household that names neither of the Returns' ids. */
const BOTH_GONE: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "ann", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "bob", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [],
}

/** The Demo's `separate` plan with another household and recorded holder, so its two Returns read as departed. */
function separateWith(household: HouseholdDocument | null, claimsHolder: string | null): Snapshot {
	const changed = structuredClone(DEMO)
	const stored = changed.reads.documents["separate"]
	if (stored?.ok !== true) throw new Error("the Demo has no separate document")
	stored.data.scenario.household = household
	stored.data.scenario.tax = {
		tax: "th-2026",
		filingStatus: "married_separate",
		children: 0,
		childrenAtHigherRate: 0,
		...(claimsHolder === null ? {} : { claimsHolder }),
	}
	return changed
}

/** The golden as a joint Return over two Filers: one Levy, and each spouse's labels on its rows. */
function joint(): ProjectionAllowances {
	const data = structuredClone(GOLDEN_ALLOWANCES)
	const filers = ["me", "partner"]
	return {
		...data,
		labels: filers.flatMap((filer) => data.labels.map((label) => `${label}@${filer}`)),
		allowances: filers.flatMap((filer) =>
			data.allowances.map((row) => ({ ...row, label: `${row.label}@${filer}` })),
		),
	}
}

describe("a departed Filer on the Tax allowances page reads as the Tax profile tables do", () => {
	const page = (snapshot: Snapshot) =>
		render(AllowancesBody, { props: { snapshot, scenario: "separate" } }).body

	test("names the recorded holder the earlier holder", () => {
		const body = page(separateWith(GONE, "me"))
		expect(body).toContain('aria-label="The earlier holder"')
		expect(body).toContain('aria-label="You"')
		expect(body).not.toContain('aria-label="me"')
	})

	test("names another departed id another person", () => {
		const body = page(separateWith(RENAMED, null))
		expect(body).toContain('aria-label="You"')
		expect(body).toContain('aria-label="Another person"')
		expect(body).not.toContain('aria-label="partner"')
	})

	test("gives two departed Returns that would read alike their ids, apart", () => {
		const body = page(separateWith(BOTH_GONE, null))
		expect(body).toContain('aria-label="Another person (me)"')
		expect(body).toContain('aria-label="Another person (partner)"')
	})

	test("shows the ids when there is no household at all", () => {
		const body = page(separateWith(null, null))
		expect(body).toContain('aria-label="me"')
		expect(body).toContain('aria-label="partner"')
		expect(body).not.toContain("Another person")
	})

	test("a joint Return over departed spouses groups each line under the same words", () => {
		const jointBody = (people: PersonNames, claimsHolder: string | null = null) =>
			render(AllowancesResult, { props: { data: joint(), plan: null, people, claimsHolder } }).body
		expect(jointBody(personNames(GONE), "me")).toContain(">The earlier holder</li>")
		expect(jointBody(personNames(GONE), "me")).toContain(">You</li>")
		expect(jointBody(personNames(RENAMED))).toContain(">Another person</li>")
		expect(jointBody(personNames(BOTH_GONE))).toContain(">Another person (me)</li>")
		expect(jointBody(personNames(BOTH_GONE))).toContain(">Another person (partner)</li>")
		expect(jointBody(personNames(null))).toContain(">me</li>")
		expect(jointBody(personNames(null))).toContain(">partner</li>")
	})
})
