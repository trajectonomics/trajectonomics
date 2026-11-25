import { type AppError, fail } from "../../errors"
import type { Household } from "./model"
import { ownedSegments } from "./owner-rules"
import { locate } from "./paths"

/**
 * Every Owner names a Flow or an Account the Scenario holds (cli ADR-0076). The shape of the path
 * was checked with the household; only a write can see the document.
 */
export function unheldOwner(household: Household, document: unknown): AppError | null {
	for (const [index, entry] of (household.owners ?? []).entries()) {
		const segments = ownedSegments(entry.path)
		if (segments === null || locate(document, segments).kind !== "missing") continue
		const path = `document.owners.${index}.path`
		return fail("invalid_input", {
			path,
			message: `${path}: the Scenario holds no item at ${entry.path}`,
			hint: "Name a Flow or an Account the Scenario holds, or add it with traj scenario apply first.",
			details: { owner: entry },
		})
	}
	return null
}
