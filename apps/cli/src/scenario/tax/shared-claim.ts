import { fromMinorUnits, toMinorUnits } from "@trajectonomics/core/money"
import type { ThLevySharedMortgage } from "@trajectonomics/core/tax/th"
import type { TaxRequest } from "./flags"
import { sharedShares } from "./shared-mortgage"

/*
 * What one separate Return claims of a loan borrowed together: its share, the whole, and the other
 * Filer whose income in each period decides the one-earner rule (cli ADR-0075).
 */

/** One Return's part of a shared loan, in satang, and the other Filer when the plan writes two Returns. */
export interface SharedClaim {
	/** This Return's part of the loan's interest, in satang. */
	readonly share: number
	/** The loan's whole interest, in satang. */
	readonly total: number
	/** The other Filer's id; absent when this is the only Return the plan writes. */
	readonly other?: string | undefined
}

/** The Levy's per-period shared-loan field, or nothing when no other Filer decides the share. */
export function sharedMortgageField(
	own: number,
	claim: SharedClaim,
): { sharedMortgage?: ThLevySharedMortgage } {
	if (claim.other === undefined) return {}
	return {
		sharedMortgage: { other: claim.other, own, total: fromMinorUnits(claim.total, 2) },
	}
}

/**
 * One Filer's part of the shared interest, and the other Filer when the plan writes two Returns.
 * The other Filer is named only when the profile states shared interest, so a plan without it
 * writes the Levies it wrote before.
 */
export function sharedClaim(
	request: TaxRequest,
	filers: readonly string[],
	at: number,
): SharedClaim {
	const other = filers[at === 0 ? 1 : 0]
	const decides = request.sharedMortgageInterest !== undefined && other !== undefined
	const total = toMinorUnits(request.sharedMortgageInterest ?? 0, 2)
	const share = sharedShares(request, filers.length)[at] ?? 0
	return { share, total, ...(decides ? { other } : {}) }
}
