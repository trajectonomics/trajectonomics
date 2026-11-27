import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { editSession } from "../../client/edit.svelte.js"
import { removeHousehold, saveHousehold } from "../../client/household-save.js"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { RAN } from "../../client/what-if.test-support"
import type { HouseholdDocument, ScenarioShow, Snapshot } from "../../lib/contract"
import { brandHouseholdHash } from "../../lib/contract/household-hash.test-support"
import { householdWithPerson } from "../../lib/view/household/document"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import HouseholdCard from "./HouseholdCard.svelte"
import HouseholdSection from "./HouseholdSection.svelte"

const realFetch = globalThis.fetch

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

/** The Demo with the first plan's household replaced, which the page names its people from. */
function withHousehold(next: HouseholdDocument): Snapshot {
	const read = DEMO.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	const scenario = { ...read.data.scenario, household: next }
	const documents = { ...DEMO.reads.documents, base: { ...read, data: { scenario } } }
	return { ...DEMO, reads: { ...DEMO.reads, documents } }
}

beforeEach(() => replaceSnapshot(withHousehold(household)))
afterAll(() => snapshotLoader.replace(LOADING))

const HOUSEHOLD_HASH = `jcs1:sha256:${"01".repeat(32)}`

/** The Demo's base read with the hashes apart, and a contentHash the household UI must not read (cli ADR 0055). */
function splitHashes(): { snapshot: Snapshot; read: ScenarioShow["scenario"] } {
	const read = DEMO.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	const scenario: ScenarioShow["scenario"] = {
		...read.data.scenario,
		household,
		householdHash: brandHouseholdHash(HOUSEHOLD_HASH),
	}
	Object.defineProperty(scenario, "contentHash", {
		get() {
			throw new Error("the household UI read the contentHash instead of the householdHash")
		},
	})
	const documents = { ...DEMO.reads.documents, base: { ...read, data: { scenario } } }
	return { snapshot: { ...DEMO, reads: { ...DEMO.reads, documents } }, read: scenario }
}

function card(options: { household?: HouseholdDocument | null; editable?: boolean } = {}): string {
	return render(HouseholdCard, {
		props: {
			name: "base",
			doc: planDocument(),
			household: options.household === undefined ? household : options.household,
			householdHash: brandHouseholdHash(
				"jcs1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			),
			editable: options.editable ?? true,
		},
	}).body
}

afterEach(() => {
	editSession.token = null
	editSession.error = null
	editSession.failure = null
	editSession.stale = false
	editSession.source = "form"
	globalThis.fetch = realFetch
})

describe("the household card", () => {
	test("shows a refused Remove household in the card, beside the control", () => {
		editSession.source = "household"
		editSession.error = "The plan has no household to remove."
		const body = card()
		expect(body).toMatch(/role="alert"[^>]*>The plan has no household to remove\./)
		expect(body.indexOf("Remove household")).toBeLessThan(body.indexOf("The plan has no household"))
	})

	test("shows the stale-plan notice in the card, and no alert when nothing was refused", () => {
		editSession.source = "household"
		editSession.stale = true
		expect(card()).toContain("This plan changed since the page read it.")
		editSession.stale = false
		expect(card()).not.toContain('role="alert"')
	})

	test("shows neither another control's refusal nor its stale-plan notice", () => {
		editSession.source = "form"
		editSession.error = "The tax profile was refused."
		editSession.stale = true
		const body = card()
		expect(body).not.toContain('role="alert"')
		expect(body).not.toContain("The tax profile was refused.")
		expect(body).not.toContain("This plan changed since the page read it.")
	})

	test("lists each person's role, birth month and life expectancy in the Dashboard's format", () => {
		const body = card()
		expect(body).toContain("Account holder")
		expect(body).toContain("Jun 1990")
		expect(body).toContain("Dependent, child")
		expect(body).toContain("Joins")
		expect(body).toContain("Jan 2028")
	})

	test("labels each anchored date with the anchor's text: at an age, or at life end", () => {
		const body = card()
		expect(body).toContain('data-item="salary"')
		expect(body).toContain("at you, age 60")
		expect(body).toContain("at you, life end")
	})

	test("says so when no household is set, and offers to set one", () => {
		const body = card({ household: null })
		expect(body).toContain("No household is set for plan base.")
		expect(body).toMatch(/<button[^>]*>\s*Set up the household\s*<\/button>/)
	})

	test("shows no controls when the server does not answer Edits", () => {
		const body = card({ editable: false })
		expect(body).not.toMatch(/<button[^>]*>\s*Add a person\s*<\/button>/)
		expect(body).not.toContain('aria-label="Edit You"')
		expect(body).not.toContain("Remove household")
		expect(body).toContain("Life expectancy")
	})

	test("offers Edit on each person, Pin a date and Remove household when Edits are answered", () => {
		const body = card()
		expect(body).toContain('aria-label="Edit You"')
		expect(body).toMatch(/<button[^>]*>\s*Pin a date\s*<\/button>/)
		expect(body).toContain("Remove household")
	})

	test("a save from the household read posts its householdHash, not its contentHash", async () => {
		const { snapshot, read } = splitHashes()
		const body = render(HouseholdSection, {
			props: { snapshot, scenario: "base", editable: true },
		}).body
		expect(body).toContain("Account holder")

		const sent: unknown[] = []
		editSession.token = "token"
		globalThis.fetch = (async (_url: string, init: RequestInit) => {
			sent.push(JSON.parse(String(init.body)))
			return Response.json(RAN)
		}) as unknown as typeof fetch
		const next = householdWithPerson(read.household, {
			id: "me",
			role: "holder",
			born: "1990-06",
			lifeExpectancy: 61,
		})
		await saveHousehold("base", read.householdHash, next)
		expect(sent).toEqual([
			{
				kind: "set-household",
				name: "base",
				householdHash: read.householdHash,
				household: next,
			},
		])
		await removeHousehold("base", read.householdHash)
		expect(sent[1]).toEqual({
			kind: "remove-household",
			name: "base",
			householdHash: read.householdHash,
		})
	})
})
