import { describe, expect, test } from "bun:test"
import type { HouseholdDocument, TaxProfile } from "../../contract"
import { NO_PEOPLE, personNames } from "../item-names"
import { claimsTable, flatClaimant } from "./claims"

const PROFILE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 1,
	childrenAtHigherRate: 0,
	lifeInsurance: 15000,
	claimsHolder: "me",
	returns: {
		// Older than the flat keys, which are the holder's claims and the ones a Levy reads.
		me: { children: 0, childrenAtHigherRate: 0, lifeInsurance: 1000 },
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

const FILERS = ["me", "partner"]

/** The same two people after the household swapped holder and partner, before `--from-stored` ran. */
const SWAPPED: HouseholdDocument = {
	...HOUSEHOLD,
	people: [
		{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
		{ id: "me", role: "partner", born: "1990-06", lifeExpectancy: 90 },
	],
}

describe("who claims each allowance", () => {
	test("holds one column per Filer, and takes the holder's cells from the flat keys", () => {
		const table = claimsTable(PROFILE, HOUSEHOLD, FILERS)
		expect(table?.people).toEqual(["me", "partner"])
		const row = (key: string) => table?.rows.find((one) => one.key === key)
		expect(row("children")?.cells).toEqual(["1", "1"])
		expect(row("parents")?.cells).toEqual(["None", "2"])
		expect(row("lifeInsurance")?.cells).toEqual(["15,000 THB", "12,000 THB"])
		expect(row("mortgageInterest")?.cells).toEqual(["None", "None"])
	})

	test("never reads the holder's older `returns` entry, even with no claimsHolder recorded", () => {
		const profile: TaxProfile = { ...PROFILE, claimsHolder: undefined }
		const table = claimsTable(profile, HOUSEHOLD, FILERS)
		const row = (key: string) => table?.rows.find((one) => one.key === key)
		expect(row("children")?.cells).toEqual(["1", "1"])
		expect(row("lifeInsurance")?.cells).toEqual(["15,000 THB", "12,000 THB"])
	})

	test("puts the flat keys in the recorded holder's column, not the household's holder", () => {
		const table = claimsTable({ ...PROFILE, claimsHolder: "partner" }, HOUSEHOLD, FILERS)
		const row = (key: string) => table?.rows.find((one) => one.key === key)
		expect(row("lifeInsurance")?.cells).toEqual(["1,000 THB", "15,000 THB"])
	})

	test("names no column for a person the projection does not file as a Filer", () => {
		const profile: TaxProfile = {
			...PROFILE,
			returns: {
				former: { children: 2, childrenAtHigherRate: 0 },
				partner: { children: 0, childrenAtHigherRate: 0 },
			},
		}
		const table = claimsTable(profile, HOUSEHOLD, ["me", "partner"])
		expect(table?.people).toEqual(["me", "partner"])
		expect(table?.rows[0]?.cells).toEqual(["1", "None"])
	})

	test("is absent for a joint or single filing, whose flat keys are the one Return's claims", () => {
		expect(claimsTable({ ...PROFILE, filingStatus: "married_joint" }, HOUSEHOLD, FILERS)).toBeNull()
	})

	test("is absent for a separate profile whose projection names no Filer", () => {
		expect(claimsTable(PROFILE, HOUSEHOLD, [])).toBeNull()
	})

	test("states the stored shared home-loan interest, split half to each Return, or none", () => {
		expect(claimsTable(PROFILE, HOUSEHOLD, FILERS)?.sharedInterest).toBeNull()
		const shared = { ...PROFILE, sharedMortgageInterest: 60000 }
		expect(claimsTable(shared, HOUSEHOLD, FILERS)?.sharedInterest).toBe("60,000 THB")
	})
})

describe("who the cards say the flat claims are", () => {
	const people = personNames(SWAPPED)

	test("names the recorded holder after a swap, and no one while the flat keys are the holder's own", () => {
		expect(flatClaimant(PROFILE, SWAPPED, people)?.subject).toBe("your partner")
		expect(flatClaimant(PROFILE, HOUSEHOLD, personNames(HOUSEHOLD))).toBeNull()
	})

	test("names no one for a joint or single filing, whose flat keys are that Return's own", () => {
		expect(flatClaimant({ ...PROFILE, filingStatus: "married_joint" }, SWAPPED, people)).toBeNull()
		expect(flatClaimant({ ...PROFILE, filingStatus: "single" }, SWAPPED, people)).toBeNull()
	})

	test("names no one after --from-stored moved the record to the new holder", () => {
		const stored = { ...PROFILE, claimsHolder: "partner" }
		expect(flatClaimant(stored, SWAPPED, people)).toBeNull()
	})

	test("names no one with no household holder, and the earlier holder for an id it no longer names", () => {
		expect(flatClaimant(PROFILE, null, NO_PEOPLE)).toBeNull()
		const gone = { ...PROFILE, claimsHolder: "gone" }
		expect(flatClaimant(gone, HOUSEHOLD, personNames(HOUSEHOLD))).toEqual({
			label: "The earlier holder",
			subject: "the earlier holder",
		})
	})
})
