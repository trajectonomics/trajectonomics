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

/** The two claim sets of a separate filing, seeded from the base and defaulting to zero. */
export function seedReturns(
	pair: Couple | null,
	base: TaxRequest | undefined,
	flat: ReturnClaims,
): Map<string, ReturnClaims> {
	const returns = new Map<string, ReturnClaims>()
	if (pair === null) return returns
	for (const person of [pair.holder.id, pair.partner.id]) {
		const held = base?.returns?.[person]
		const claims = held ?? (person === pair.holder.id ? claimsOfRequest(flat) : zeroClaims())
		returns.set(person, { ...claims, allowances: { ...claims.allowances } })
	}
	return returns
}
