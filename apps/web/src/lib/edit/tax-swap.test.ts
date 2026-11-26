import { describe, expect, test } from "bun:test"
import type { HouseholdDocument, TaxProfile } from "../contract"
import { leafOf } from "../snapshot/leaves"
import { editSchema } from "./edit"
import { carriesFlatClaim, taxSwapRead, taxSwapRefusal, taxSwapShow } from "./tax-swap"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`

const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [{ path: "flows.salary", person: "me" }],
}

const SWAPPED: HouseholdDocument = {
	...HOUSEHOLD,
	people: [
		{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
		{ id: "me", role: "partner", born: "1990-06", lifeExpectancy: 90 },
	],
}

const PROFILE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	claimsHolder: "me",
	lifeInsurance: 15000,
	returns: { partner: { children: 0, childrenAtHigherRate: 0 } },
}

const edit = (body: object) => editSchema.parse(body)

describe("the re-read a tax Edit makes before a flat claim", () => {
	test("reads the scenario show leaf, so the edit server runs no write", () => {
		expect(taxSwapRead("base").argv).toEqual(["scenario", "show", "--json", "--", "base"])
		expect(leafOf(taxSwapRead("base").argv)).toBe("scenario show")
	})

	test("is needed by a merge or whole save that carries a flat claim, and by nothing else", () => {
		expect(
			carriesFlatClaim(
				edit({
					kind: "merge-tax",
					name: "base",
					contentHash: HASH,
					flags: { lifeInsurance: "16000" },
				}),
			),
		).toBe(true)
		expect(
			carriesFlatClaim(
				edit({
					kind: "set-tax",
					name: "base",
					contentHash: HASH,
					flags: { filingStatus: "single", children: "1" },
				}),
			),
		).toBe(true)
		expect(
			carriesFlatClaim(
				edit({
					kind: "merge-tax",
					name: "base",
					contentHash: HASH,
					flags: { sharedMortgageInterest: "60000" },
				}),
			),
		).toBe(false)
		expect(
			carriesFlatClaim(
				edit({
					kind: "set-tax",
					name: "base",
					contentHash: HASH,
					flags: { filingStatus: "single" },
				}),
			),
		).toBe(false)
		expect(carriesFlatClaim(edit({ kind: "remove-tax", name: "base", contentHash: HASH }))).toBe(
			false,
		)
	})

	test("parses the plain --json show, whose document is not the decimal form the page reads", () => {
		const shown = taxSwapShow.parse({
			scenario: { household: HOUSEHOLD, tax: PROFILE, document: { flows: [{ amount: 100000 }] } },
		})
		expect(shown.scenario.household).toEqual(HOUSEHOLD)
		expect(shown.scenario.tax).toEqual(PROFILE)
	})
})

describe("the refusal of a flat claim the recorded holder still claims", () => {
	test("keeps the flat claims of a holder who is still in the household", () => {
		expect(taxSwapRefusal({ household: SWAPPED, tax: PROFILE }, "base")).toMatchObject({
			code: "tax_claims_recorded_elsewhere",
			message: expect.stringContaining("traj scenario tax base --from-stored"),
		})
	})

	test("says nothing while the recorded holder is the household's, or for a joint filing", () => {
		expect(taxSwapRefusal({ household: HOUSEHOLD, tax: PROFILE }, "base")).toBeNull()
		expect(
			taxSwapRefusal(
				{ household: SWAPPED, tax: { ...PROFILE, filingStatus: "married_joint" } },
				"base",
			),
		).toBeNull()
		expect(taxSwapRefusal({ household: SWAPPED, tax: null }, "base")).toBeNull()
	})

	test("names no id when the recorded holder has left the household", () => {
		const refused = taxSwapRefusal(
			{ household: SWAPPED, tax: { ...PROFILE, claimsHolder: "gone" } },
			"base",
		)
		expect(refused?.message).toContain("the earlier holder")
		expect(refused?.message).not.toContain("gone")
		expect(refused?.message).toContain(
			"stay unclaimed until they are stated for a person who has a Return",
		)
	})
})
