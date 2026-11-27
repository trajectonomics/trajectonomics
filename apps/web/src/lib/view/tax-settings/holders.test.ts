import { describe, expect, test } from "bun:test"
import type { Read, ScenarioShow, Snapshot } from "../../contract"
import { brandHouseholdHash } from "../../contract/household-hash.test-support"
import { claimsHolderOf, snapshotClaimsHolders } from "./holders"

/** A `scenario show` of one plan, with the tax profile the plan stores or none. */
function show(tax: ScenarioShow["scenario"]["tax"] = null): ScenarioShow {
	return {
		scenario: {
			id: "id",
			name: "base",
			contentHash: "hash",
			forkedFrom: null,
			version: 1,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
			document: { currency: "THB", flows: [], accounts: [] },
			household: null,
			householdHash: brandHouseholdHash("hash"),
			tax,
		},
	}
}

/** A stored tax profile of a separate filing, with the holder it records or none. */
function profile(claimsHolder?: string): ScenarioShow["scenario"]["tax"] {
	return {
		tax: "th-2026",
		filingStatus: "married_separate",
		children: 0,
		childrenAtHigherRate: 0,
		...(claimsHolder === undefined ? {} : { claimsHolder }),
	}
}

/** A Snapshot holding three document Reads: one with a holder, one with none, and one that failed. */
const SNAPSHOT = {
	reads: {
		documents: {
			held: { argv: ["scenario", "show", "held"], ok: true, data: show(profile("me")) },
			none: { argv: ["scenario", "show", "none"], ok: true, data: show(profile()) },
			failed: {
				argv: ["scenario", "show", "failed"],
				ok: false,
				error: { code: "read_failed", exitCode: 1, message: "traj could not read the plan" },
			},
		} satisfies Record<string, Read<ScenarioShow>>,
	},
} as unknown as Snapshot

describe("the claimsHolder a plan's stored tax profile records", () => {
	test("reads the holder a stored profile records", () => {
		expect(claimsHolderOf(SNAPSHOT, "held")).toBe("me")
	})

	test("reads none when the profile records none", () => {
		expect(claimsHolderOf(SNAPSHOT, "none")).toBeNull()
	})

	test("reads none when the document Read failed", () => {
		expect(claimsHolderOf(SNAPSHOT, "failed")).toBeNull()
	})

	test("reads none for no plan, or a plan the Snapshot does not hold", () => {
		expect(claimsHolderOf(SNAPSHOT, null)).toBeNull()
		expect(claimsHolderOf(SNAPSHOT, "gone")).toBeNull()
	})

	test("maps each plan by name, so a page showing several reads each one's own holder", () => {
		expect(snapshotClaimsHolders(SNAPSHOT, ["held", "none", "failed"])).toEqual({
			held: "me",
			none: null,
			failed: null,
		})
	})
})
