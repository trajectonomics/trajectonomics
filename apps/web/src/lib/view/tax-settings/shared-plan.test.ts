import { describe, expect, test } from "bun:test"
import type { HouseholdDocument, ScenarioDocument, TaxProfile } from "../../contract"
import { planDocument } from "../plan-items/fixtures.test-support"
import { canClaimShared, sharedInterestClaimed } from "./shared-plan"

const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [{ path: "flows.salary", person: "me" }],
}

const PROFILE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	sharedMortgageInterest: 60000,
}

/** The fixture plan with the Levies the test names. */
function withLevies(levies: readonly unknown[]): ScenarioDocument {
	return { ...planDocument(), levies: [...levies] }
}

describe("whether the plan may state a shared home-loan interest", () => {
	test("a household with a partner and Owners may, as `traj` reads `shared=`", () => {
		expect(canClaimShared(HOUSEHOLD)).toBe(true)
	})

	test("no household, no partner, or no Owners may not", () => {
		expect(canClaimShared(null)).toBe(false)
		const noOwners = { ...HOUSEHOLD, owners: [] }
		expect(canClaimShared(noOwners)).toBe(false)
		const noPartner = { ...HOUSEHOLD, people: HOUSEHOLD.people.slice(0, 1) }
		expect(canClaimShared(noPartner)).toBe(false)
		const noHolder = { ...HOUSEHOLD, people: HOUSEHOLD.people.slice(1) }
		expect(canClaimShared(noHolder)).toBe(false)
	})
})

describe("whether a Return claims the stored shared interest", () => {
	test("a separate profile with a Levy id naming a Filer claims it", () => {
		expect(sharedInterestClaimed(PROFILE, withLevies([{ id: "th-2026-pit@me" }]))).toBe(true)
		expect(
			sharedInterestClaimed(
				PROFILE,
				withLevies([{ id: "th-2026-pit" }, { id: "th-2026-pit@partner" }]),
			),
		).toBe(true)
	})

	test("another status, or no Levy id naming a Filer, claims none", () => {
		expect(
			sharedInterestClaimed(
				{ ...PROFILE, filingStatus: "married_joint" },
				withLevies([{ id: "th-2026-pit@me" }]),
			),
		).toBe(false)
		expect(sharedInterestClaimed(PROFILE, withLevies([{ id: "th-2026-pit" }]))).toBe(false)
		expect(sharedInterestClaimed(PROFILE, withLevies([]))).toBe(false)
		const { levies: _levies, ...untaxed } = planDocument()
		expect(sharedInterestClaimed(PROFILE, untaxed)).toBe(false)
	})

	test("keeps an entry that is not a Levy object as it is, and claims nothing for it", () => {
		expect(sharedInterestClaimed(PROFILE, withLevies([null, "th-2026-pit@me", {}]))).toBe(false)
	})
})
