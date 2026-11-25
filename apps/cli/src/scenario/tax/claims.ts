import { type AppError, fail } from "../../errors"
import { allowancesOf } from "./allowances"
import { requestOfClaims } from "./claims-request"
import { claimsOf } from "./claims-values"
import type { Couple } from "./couple"
import type { TaxFlags, TaxRequest } from "./flags"
import { requestOfStored, type StoredTax } from "./stored"

/**
 * The caller's flags as one request, `null` when they state no `--tax`, or why a value cannot be
 * read. The mode guards in `mode.ts` run first, so this only resolves the profile's values.
 */
export function taxRequestOf(flags: TaxFlags, couple: Couple | null): TaxRequest | AppError | null {
	if (flags.tax === undefined) return null
	const stated = claimsOf(flags)
	if (!(stated instanceof Map)) return stated
	return requestOfClaims({
		status: flags.filingStatus ?? "single",
		couple,
		stated,
		base: {
			jurisdiction: flags.tax,
			filingStatus: "single",
			children: 0,
			childrenAtHigherRate: 0,
			allowances: allowancesOf({}),
		},
	})
}

/** The request a merge states: the stored profile, with each flag the caller gave laid over it. */
export function mergedRequest(
	stored: StoredTax,
	flags: TaxFlags,
	couple: Couple | null,
): TaxRequest | AppError {
	const base = requestOfStored(stored)
	if (flags.tax !== undefined && flags.tax !== base.jurisdiction) {
		return fail("invalid_input", {
			path: "tax",
			message: `--merge changes the profile stored for ${base.jurisdiction}, so --tax ${flags.tax} cannot name another jurisdiction.`,
			hint: "To switch jurisdiction, state the profile whole with --tax and every flag it needs.",
		})
	}
	const stated = claimsOf(flags)
	if (!(stated instanceof Map)) return stated
	return requestOfClaims({
		status: flags.filingStatus ?? base.filingStatus,
		couple,
		stated,
		base,
	})
}
