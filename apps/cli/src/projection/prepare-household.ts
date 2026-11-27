import { type AppError, fail } from "../errors"
import { householdDocument } from "../scenario/household/document"
import type { Household } from "../scenario/household/model"

/**
 * The household a leaf reads: null when the caller never reads one, else the stored row parsed
 * again, where a row written by `scenario household` always parses (cli ADR-0048).
 */
export function householdFor(
	stored: string | null,
	readHousehold: boolean | undefined,
): Household | null | AppError {
	if (readHousehold === false) return null
	return householdOfRow(stored)
}

/**
 * A stored household, parsed again: a row written by `scenario household` always parses (cli
 * ADR-0048). The parse sits inside the guard, so a corrupt row returns the `internal` failure
 * rather than throwing out of the command.
 */
function householdOfRow(stored: string | null): Household | null | AppError {
	if (stored === null) return null
	let value: unknown
	try {
		value = JSON.parse(stored)
	} catch {
		return unreadableHousehold()
	}
	const parsed = householdDocument.safeParse(value)
	return parsed.success ? parsed.data : unreadableHousehold()
}

/** The one failure a stored text that is not a household deserves: a bug, not the caller's. */
function unreadableHousehold(): AppError {
	return fail("internal", { message: "The stored household does not parse as a household." })
}
