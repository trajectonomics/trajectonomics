import { allowancesOf } from "./allowances"
import type { Couple } from "./couple"
import type { ReturnClaims, TaxRequest } from "./flags"

/** A Return that states nothing, with a zero for each deduction (cli ADR-0075). */
export function zeroClaims(): ReturnClaims {
	return { children: 0, childrenAtHigherRate: 0, allowances: allowancesOf({}) }
}

/** The claims a request states, as one Return's claims. */
export function claimsOfRequest(request: ReturnClaims): ReturnClaims {
	return {
		children: request.children,
		childrenAtHigherRate: request.childrenAtHigherRate,
		allowances: { ...request.allowances },
	}
}

/**
 * The two claim sets of a separate filing. The holder's is always the flat claims, which the caller
 * has made theirs (`claimsHeldBy`), so an entry the base holds for them is never read: it can be older
 * than the flat claims. The partner's is the base's, or nothing.
 */
export function seedReturns(
	pair: Couple | null,
	base: TaxRequest | undefined,
	flat: ReturnClaims,
): Map<string, ReturnClaims> {
	const returns = new Map<string, ReturnClaims>()
	if (pair === null) return returns
	const seeds: [string, ReturnClaims][] = [
		[pair.holder.id, flat],
		[pair.partner.id, base?.returns?.[pair.partner.id] ?? zeroClaims()],
	]
	for (const [person, claims] of seeds) returns.set(person, claimsOfRequest(claims))
	return returns
}
