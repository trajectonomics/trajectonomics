import { describe, expect, test } from "bun:test"
import type { HouseholdDocument, TaxProfile } from "../../contract"
import { claimsTable } from "./claims"

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
