import { describe, expect, test } from "bun:test"
import type { TaxProfile } from "../../contract"
import { claimsTable, sharedLiabilityNotes } from "./claims"

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

describe("who claims each allowance", () => {
	test("holds one column per Return, the household's people first, and each cell that Return's claim", () => {
		const table = claimsTable(PROFILE, ["me", "partner", "mali"])
		expect(table?.people).toEqual(["me", "partner"])
		const row = (key: string) => table?.rows.find((one) => one.key === key)
		expect(row("children")?.cells).toEqual(["1", "1"])
		expect(row("parents")?.cells).toEqual(["None", "2"])
		expect(row("lifeInsurance")?.cells).toEqual(["15,000 THB", "12,000 THB"])
		expect(row("mortgageInterest")?.cells).toEqual(["None", "None"])
	})

	test("keeps a person the household no longer lists, after its people, and states a zero claim as none", () => {
		const profile: TaxProfile = {
			...PROFILE,
			returns: {
				former: { children: 0, childrenAtHigherRate: 0 },
				partner: { children: 0, childrenAtHigherRate: 0 },
			},
		}
		const table = claimsTable(profile, ["me", "partner"])
		expect(table?.people).toEqual(["partner", "former"])
		expect(table?.rows[0]?.cells).toEqual(["None", "None"])
	})

	test("is absent for a joint or single filing, whose flat keys are the one Return's claims", () => {
		expect(claimsTable({ ...PROFILE, filingStatus: "married_joint" }, ["me"])).toBeNull()
		expect(claimsTable({ ...PROFILE, returns: undefined }, ["me"])).toBeNull()
	})
})

describe("the shared home-loan assumption", () => {
	const note = "Each separate Return's interest is taken to be on separate loans."
	const ceiling = {
		path: "allowances.mortgageInterestCeiling",
		value: 100000,
		status: "reported" as const,
		note,
	}
	const other = {
		path: "allowances.personal",
		value: 60000,
		status: "reported" as const,
		note: "Other.",
	}
	const year = (assumptions: (typeof ceiling | typeof other)[]) => ({ assumptions })

	test("states each note the CLI writes for the shared ceiling once, in its order, and no other figure", () => {
		expect(sharedLiabilityNotes([year([other, ceiling]), year([ceiling])])).toEqual([note])
	})

	test("is empty when the CLI states nothing about a shared loan", () => {
		expect(sharedLiabilityNotes([year([other]), year([])])).toEqual([])
	})
})
