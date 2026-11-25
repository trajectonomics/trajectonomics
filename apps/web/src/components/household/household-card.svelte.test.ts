import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession } from "../../client/edit.svelte.js"
import type { HouseholdDocument } from "../../lib/contract"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import HouseholdCard from "./HouseholdCard.svelte"

const household: HouseholdDocument = {
	schemaVersion: 1,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88, joins: "2028-01" },
		{ id: "mali", role: "dependent", relation: "child", born: "2027-09", lifeExpectancy: 90 },
	],
	anchors: [
		{ path: "flows.salary.end", person: "me", age: 60 },
		{ path: "flows.pension.end", person: "me", at: "lifeEnd" },
	],
}

function card(options: { household?: HouseholdDocument | null; editable?: boolean } = {}): string {
	return render(HouseholdCard, {
		props: {
			name: "base",
			doc: planDocument(),
			household: options.household === undefined ? household : options.household,
			contentHash: "jcs1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			editable: options.editable ?? true,
		},
	}).body
}

afterEach(() => {
	editSession.error = null
	editSession.stale = false
})

describe("the household card", () => {
	test("shows a refused Remove household in the card, beside the control", () => {
		editSession.error = "The plan has no household to remove."
		const body = card()
		expect(body).toMatch(/role="alert"[^>]*>The plan has no household to remove\./)
		expect(body.indexOf("Remove household")).toBeLessThan(body.indexOf("The plan has no household"))
	})

	test("shows the stale-plan notice in the card, and no alert when nothing was refused", () => {
		editSession.stale = true
		expect(card()).toContain("This plan changed since the page read it.")
		editSession.stale = false
		expect(card()).not.toContain('role="alert"')
	})

	test("lists each person's role, birth month and life expectancy as the stored text", () => {
		const body = card()
		expect(body).toContain("Account holder")
		expect(body).toContain("1990-06")
		expect(body).toContain("Dependent, child")
		expect(body).toContain("Joins")
		expect(body).toContain("2028-01")
	})

	test("labels each anchored date with the anchor's text: at an age, or at life end", () => {
		const body = card()
		expect(body).toContain("flows.salary.end")
		expect(body).toContain("at me, age 60")
		expect(body).toContain("at me, life end")
	})

	test("says so when no household is set, and offers to set one", () => {
		const body = card({ household: null })
		expect(body).toContain("No household is set for plan base.")
		expect(body).toMatch(/<button[^>]*>\s*Set up the household\s*<\/button>/)
	})

	test("shows no controls when the server does not answer Edits", () => {
		const body = card({ editable: false })
		expect(body).not.toMatch(/<button[^>]*>\s*Add a person\s*<\/button>/)
		expect(body).not.toContain('aria-label="Edit me"')
		expect(body).not.toContain("Remove household")
		expect(body).toContain("Life expectancy")
	})

	test("offers Edit on each person, Pin a date and Remove household when Edits are answered", () => {
		const body = card()
		expect(body).toContain('aria-label="Edit me"')
		expect(body).toMatch(/<button[^>]*>\s*Pin a date\s*<\/button>/)
		expect(body).toContain("Remove household")
	})
})
