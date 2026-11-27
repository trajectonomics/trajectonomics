import { type AppError, fail } from "../../errors"
import { householdDocument } from "./document"
import type { Household } from "./model"

/**
 * A stored household, parsed again: a row written by `scenario household` always parses (cli
 * ADR-0048). The parse sits inside the guard, so a corrupt row returns the `internal` failure
 * rather than throwing out of the command, and the error it caught rides along for `TRAJ_DEBUG`
 * (a parse error's stack, or the schema's list of issues).
 */
export function storedHousehold(stored: string): Household | AppError {
	let value: unknown
	try {
		value = JSON.parse(stored)
	} catch (error) {
		return unreadableHousehold(error)
	}
	// The schema checks the row; the row itself is returned, so its stored key order prints as it was.
	const parsed = householdDocument.safeParse(value)
	return parsed.success ? (value as Household) : unreadableHousehold(parsed.error)
}

/** The one failure a stored text that is not a household deserves: a bug, not the caller's. */
function unreadableHousehold(cause: unknown): AppError {
	return fail("internal", {
		message: "The stored household does not parse as a household.",
		cause,
	})
}
