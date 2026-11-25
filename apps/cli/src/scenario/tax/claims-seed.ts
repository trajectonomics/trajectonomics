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
 * The two claim sets of a separate filing, seeded from the base and defaulting to zero. The holder's
 * is the flat claims unless the base is itself a separate filing that holds it: under any other status
 * the flat claims are what the caller last changed.
 */
export function seedReturns(
	pair: Couple | null,
	base: TaxRequest | undefined,
	flat: ReturnClaims,
): Map<string, ReturnClaims> {
	const returns = new Map<string, ReturnClaims>()
	if (pair === null) return returns
	const held = base?.returns ?? {}
	const own = base?.filingStatus === "married_separate" ? held[pair.holder.id] : undefined
	const seeds: [string, ReturnClaims][] = [
		[pair.holder.id, own ?? claimsOfRequest(flat)],
		[pair.partner.id, held[pair.partner.id] ?? zeroClaims()],
	]
	for (const [person, claims] of seeds) {
		returns.set(person, { ...claims, allowances: { ...claims.allowances } })
	}
	return returns
}
