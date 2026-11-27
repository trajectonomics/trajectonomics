import type { AppError } from "../errors"
import type { Household } from "../scenario/household/model"
import { storedHousehold } from "../scenario/household/stored"

/**
 * The household a leaf reads: null when the caller never reads one, else the stored row parsed
 * again, where a row written by `scenario household` always parses (cli ADR-0048).
 */
export function householdFor(
	stored: string | null,
	readHousehold: boolean | undefined,
): Household | null | AppError {
	if (readHousehold === false || stored === null) return null
	return storedHousehold(stored)
}
