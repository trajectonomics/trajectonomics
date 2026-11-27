import type { HouseholdDocument } from "../lib/contract"
import { editSession } from "./edit.svelte.js"

/**
 * Saves a whole household as one Edit. The Edit names the `householdHash` the page read, never the
 * `contentHash`: a household change that moves no anchored date leaves the document's contentHash as
 * it was, so only the householdHash refuses a save over a household changed elsewhere (cli ADR 0055).
 */
export function saveHousehold(
	name: string,
	householdHash: string,
	household: HouseholdDocument,
): Promise<boolean> {
	return editSession.run({ kind: "set-household", name, householdHash, household }, "household")
}

/** Removes the plan's household, naming the `householdHash` the page read (cli ADR 0055). */
export function removeHousehold(name: string, householdHash: string): Promise<boolean> {
	return editSession.run({ kind: "remove-household", name, householdHash }, "household")
}
