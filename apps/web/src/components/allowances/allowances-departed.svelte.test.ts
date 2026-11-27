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
		expect(body).toMatch(/<code[^>]*data-unnamed[^>]*>me<\/code>/)
		expect(body).toMatch(/<code[^>]*data-unnamed[^>]*>partner<\/code>/)
	})

	test("a joint Return over departed spouses groups each line under the same words", () => {
		const jointBody = (people: PersonNames, claimsHolder: string | null = null) =>
			render(AllowancesResult, { props: { data: joint(), plan: null, people, claimsHolder } }).body
		expect(jointBody(personNames(GONE), "me")).toMatch(/>The earlier holder<\/span>/)
		expect(jointBody(personNames(GONE), "me")).toMatch(/>You<\/span>/)
		expect(jointBody(personNames(RENAMED))).toMatch(/>Another person<\/span>/)
		expect(jointBody(personNames(BOTH_GONE))).toMatch(/>Another person \(me\)<\/span>/)
		expect(jointBody(personNames(BOTH_GONE))).toMatch(/>Another person \(partner\)<\/span>/)
		expect(jointBody(personNames(null))).toMatch(/<code[^>]*data-unnamed[^>]*>me<\/code>/)
		expect(jointBody(personNames(null))).toMatch(/<code[^>]*data-unnamed[^>]*>partner<\/code>/)
	})
})

/** The joint Return with both spouses' RMF suggestions left without an Account, as a joint plan reads them. */
function jointWithoutRmfTarget(): ProjectionAllowances {
	const data = joint()
	return {
		...data,
		allowances: data.allowances.map((row) => {
			if (!row.label.startsWith("allowance.retirement.rmf")) return row
			const changed = structuredClone(row)
			if (changed.flow !== undefined) delete changed.flow.target
			changed.hint = "Pick the asset Account."
			return changed
		}),
	}
}

const PLAN = {
	name: "base",
	contentHash: `jcs1:sha256:${"ab".repeat(32)}`,
	doc: { currency: "THB", flows: [], accounts: [] },
}

describe("a joint Return with an unplaced RMF for each Filer", () => {
	test("renders and says whose each RMF is", () => {
		const body = render(AllowancesResult, {
			props: {
				data: jointWithoutRmfTarget(),
				plan: PLAN,
				people: personNames(GONE),
				claimsHolder: "me",
			},
		}).body
		expect(body.match(/RMF(?:<!--.*?-->)* \(/g)).toHaveLength(2)
		expect(body).toMatch(
			/RMF(?:<!--.*?-->)* \((?:<!--.*?-->)*<span[^>]*data-item="me"[^>]*>The earlier holder<\/span>/,
		)
		expect(body).toMatch(
			/RMF(?:<!--.*?-->)* \((?:<!--.*?-->)*<span[^>]*data-item="partner"[^>]*>You<\/span>/,
		)
	})
})
