import { describe, expect, test } from "bun:test"
import type { ScenarioShow } from "../contract"
import { failedRead } from "./fixtures.test-support"
import { hasTaxProfile, planTaxNotes } from "./stage-two-tax-notes"

function shown(tax: ScenarioShow["scenario"]["tax"]): ScenarioShow {
	return {
		scenario: {
			id: "id",
			name: "base",
			contentHash: "hash",
			householdHash: "hash-household",
			forkedFrom: null,
			version: 1,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
			document: { currency: "THB", flows: [], accounts: [] },
			household: null,
			tax,
		},
	}
}

function read(tax: ScenarioShow["scenario"]["tax"]) {
	return { argv: ["scenario", "show"], ok: true as const, data: shown(tax) }
}

describe("the tax-note reads of the Plan", () => {
	test("each plan asks for a dry run from its stored profile, and its name follows --", () => {
		expect(planTaxNotes(["base"])).toEqual({
			base: {
				argv: ["scenario", "tax", "--from-stored", "--dry-run", "--json", "--", "base"],
				carryInFor: [],
			},
		})
	})

	test("a name that starts with a dash is still read as a name", () => {
		expect(planTaxNotes(["-x"])["-x"]?.argv.slice(-2)).toEqual(["--", "-x"])
	})

	test("only a plan that keeps a tax profile is asked; a failed or absent document is not", () => {
		const profile = {
			tax: "th-2026" as const,
			filingStatus: "single" as const,
			children: 0,
			childrenAtHigherRate: 0,
		}
		expect(hasTaxProfile(read(profile))).toBe(true)
		expect(hasTaxProfile(read(null))).toBe(false)
		expect(hasTaxProfile(read(undefined))).toBe(false)
		expect(hasTaxProfile(failedRead(["scenario", "show"]))).toBe(false)
		expect(hasTaxProfile(undefined)).toBe(false)
	})
})
