import type { HouseholdDocument, ScenarioShow } from "../lib/contract"
import { editSession } from "./edit.svelte.js"

/** The household hash a read states: only it, never a `contentHash`, names a household write (cli ADR 0055). */
export type HouseholdHash = ScenarioShow["scenario"]["householdHash"]

/**
 * Saves a whole household as one Edit. The Edit names the `householdHash` the page read, never the
 * `contentHash`: a household change that moves no anchored date leaves the document's contentHash as
 * it was, so only the householdHash refuses a save over a household changed elsewhere (cli ADR 0055).
 */
export function saveHousehold(
	name: string,
	householdHash: HouseholdHash,
	household: HouseholdDocument,
): Promise<boolean> {
	return editSession.run({ kind: "set-household", name, householdHash, household }, "household")
}

/** Removes the plan's household, naming the `householdHash` the page read (cli ADR 0055). */
export function removeHousehold(name: string, householdHash: HouseholdHash): Promise<boolean> {
	return editSession.run({ kind: "remove-household", name, householdHash }, "household")
}
