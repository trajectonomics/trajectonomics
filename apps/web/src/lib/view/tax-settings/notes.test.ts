import { describe, expect, test } from "bun:test"
import type { ScenarioTax } from "../../contract"
import { NO_PEOPLE } from "../item-names"
import {
	ANOTHER_PERSON,
	claimNoteLines,
	DEPARTED_CLAIMS_MARKER,
	DEPARTED_CLAIMS_OPENING,
	departedNoteInHouseholdWords,
	SEPARATE_LOANS_SENTENCE,
	taxNotesOf,
} from "./notes"

const SCENARIO: ScenarioTax["scenario"] = {
	id: "id",
	name: "base",
	contentHash: "hash",
	forkedFrom: null,
	version: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	document: {},
}

const CLI_SENTENCE = `${SEPARATE_LOANS_SENTENCE}, each under its own ceiling.`
const SHARED = "60,000 baht of shared home-loan interest is stored for separate Returns."
const KEPT = 'The claims stored for "partner" are kept for a separate filing.'
const DEPARTED = 'The claims stored for "gone", who is not in the household, are on no Return.'

function result(extra: Partial<ScenarioTax>): ScenarioTax {
	return { dryRun: true, status: "unchanged", scenario: SCENARIO, ...extra }
}

describe("the CLI's notes about the stored claims", () => {
	test("keeps the CLI's separate-loans sentence, not tax-core's bare note", () => {
		const notes = taxNotesOf(
			result({
				assumptions: [
					{
						path: "allowances.mortgageInterestCeiling",
						value: 100000,
						status: "reported",
						note: `Home-loan interest ceiling, baht. ${CLI_SENTENCE}`,
					},
				],
			}),
		)
		expect(notes.separateLoans).toBe(CLI_SENTENCE)
		expect(notes.separateLoans).not.toContain("Home-loan interest ceiling, baht.")
	})

	test("states no separate-loans note when the ceiling's entry says only tax-core's figure", () => {
		const notes = taxNotesOf(
			result({
				assumptions: [
					{
						path: "allowances.mortgageInterestCeiling",
						value: 100000,
						status: "reported",
						note: "Home-loan interest ceiling, baht.",
					},
				],
			}),
		)
		expect(notes.separateLoans).toBeNull()
	})

	test("keeps every unclaimed sentence in the CLI's order", () => {
		expect(taxNotesOf(result({ unclaimed: [SHARED, KEPT, DEPARTED] })).unclaimed).toEqual([
			SHARED,
			KEPT,
			DEPARTED,
		])
	})

	test("lists the separate-loans note first, then the unclaimed sentences, one line each", () => {
		const read = {
			argv: ["scenario", "tax"],
			ok: true as const,
			data: { separateLoans: CLI_SENTENCE, unclaimed: [SHARED, KEPT] },
		}
		expect(claimNoteLines(read)).toEqual([CLI_SENTENCE, SHARED, KEPT])
	})

	test("says a departed id's note in the household's words, never the id the CLI quotes", () => {
		// The recorded holder of the flat claims is the earlier holder.
		expect(departedNoteInHouseholdWords(DEPARTED, NO_PEOPLE, "gone")).toBe(
			"The claims stored for the earlier holder, who is not in the household, are on no Return.",
		)
		// Any other departed id, such as a renamed partner's, is never called the holder.
		expect(departedNoteInHouseholdWords(DEPARTED, NO_PEOPLE, "me")).toBe(
			`The claims stored for ${ANOTHER_PERSON}, who is not in the household, are on no Return.`,
		)
		expect(departedNoteInHouseholdWords(DEPARTED, NO_PEOPLE)).toBe(
			`The claims stored for ${ANOTHER_PERSON}, who is not in the household, are on no Return.`,
		)
		// The note keeps the CLI's opening words, and everything after the quoted id as it wrote them.
		expect(DEPARTED.startsWith(DEPARTED_CLAIMS_OPENING)).toBe(true)
		expect(DEPARTED).toContain(DEPARTED_CLAIMS_MARKER)
		expect(
			departedNoteInHouseholdWords(`${DEPARTED} State any that still apply.`, NO_PEOPLE, "gone"),
		).toBe(
			"The claims stored for the earlier holder, who is not in the household, are on no Return. State any that still apply.",
		)
	})

	test("leaves a note about a person still in the household as the CLI wrote it", () => {
		expect(departedNoteInHouseholdWords(KEPT, NO_PEOPLE)).toBe(KEPT)
		expect(
			claimNoteLines(
				{
					argv: ["scenario", "tax"],
					ok: true,
					data: { separateLoans: null, unclaimed: [KEPT, DEPARTED] },
				},
				NO_PEOPLE,
				"gone",
			),
		).toEqual([
			KEPT,
			"The claims stored for the earlier holder, who is not in the household, are on no Return.",
		])
	})

	test("shows nothing false when the CLI refused the dry run, or the Snapshot kept no read", () => {
		expect(
			claimNoteLines({
				argv: ["scenario", "tax"],
				ok: false,
				error: { code: "invalid_input", exitCode: 2, message: "refused" },
			}),
		).toEqual([])
		expect(claimNoteLines(undefined)).toEqual([])
	})
})
