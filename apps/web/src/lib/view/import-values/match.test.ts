import { describe, expect, test } from "bun:test"
import { CHART, sheetSnapshot } from "../record-values/fixtures.test-support"
import { valueSheet } from "../record-values/sheet"
import type { ValueSheet } from "../record-values/types"
import { autoMatches, keepChoices, matchComplete, matchedSources, SKIP, targetsOf } from "./match"
import type { ImportSource } from "./types"

const sheet = valueSheet(sheetSnapshot(CHART)) as ValueSheet
const targets = targetsOf(sheet)
const source = (label: string, count = 1): ImportSource => ({
	key: label,
	label,
	count,
	first: "2026-01-31",
	last: "2026-12-31",
})

describe("the accounts the dropdown offers", () => {
	test("are the open asset and liability Leaf Accounts, in the sheet's groups", () => {
		expect(targets.map((target) => target.id)).toContain("bank")
		expect(targets.find((target) => target.id === "debt")).toMatchObject({
			group: "Debts",
			owed: true,
		})
		expect(targets.map((target) => target.id)).not.toContain("gains")
		expect(targets.map((target) => target.id)).not.toContain("old-debt")
		expect(targets.map((target) => target.id)).not.toContain("cash-header")
	})
})

describe("matching", () => {
	test("an exact name or id is chosen, and anything else is left to the person", () => {
		const matches = autoMatches(
			[source("Bank"), source("index"), source("Car Loan"), source("bank "), source("Savings")],
			targets,
		)
		expect(matches).toEqual({ Bank: "bank", index: "index", "Car Loan": "debt" })
	})

	test("a name that two accounts share is not chosen for the person", () => {
		const twice = [...targets, { id: "other", name: "Bank", group: "Assets", owed: false }]
		expect(autoMatches([source("Bank")], twice)).toEqual({})
	})

	test("what the person chose is kept for the accounts still in the table, and a gone account's id is dropped", () => {
		const kept = keepChoices(
			{ Savings: "bank", Other: SKIP, Gone: "no-such" },
			[source("Savings"), source("Other"), source("Gone"), source("Bank")],
			targets,
		)
		expect(kept).toEqual({ Savings: "bank", Other: SKIP, Bank: "bank" })
	})
})

describe("when Next is allowed", () => {
	const sources = [source("A"), source("B")]
	test("only when every account is matched or skipped, and at least one is matched", () => {
		expect(matchComplete(sources, {})).toBe(false)
		expect(matchComplete(sources, { A: "bank" })).toBe(false)
		expect(matchComplete(sources, { A: "bank", B: SKIP })).toBe(true)
		expect(matchComplete(sources, { A: SKIP, B: SKIP })).toBe(false)
		expect(matchedSources(sources, { A: "bank", B: SKIP }).map((each) => each.key)).toEqual(["A"])
	})
})
