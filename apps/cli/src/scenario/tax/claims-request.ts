import type { AppError } from "../../errors"
import { applyStated, namedValues } from "./claims-apply"
import { checkedClaims, checkedCounts, checkedPersons } from "./claims-check"
import { claimsOfRequest, seedReturns, zeroClaims } from "./claims-seed"
import type { Stated } from "./claims-values"
import type { Couple } from "./couple"
import type { ReturnClaims, TaxRequest, ThFilingStatus } from "./flags"

/** The request the resolved claims state: one Return, or one claim set per Return of a separate filing. */
function assembled(
	status: ThFilingStatus,
	base: TaxRequest | undefined,
	flat: ReturnClaims,
	returns: Map<string, ReturnClaims>,
	pair: Couple | null,
): TaxRequest | AppError {
	const jurisdiction = base?.jurisdiction ?? "th-2026"
	if (pair === null) {
		const request = { jurisdiction, filingStatus: status, ...flat }
		const held = base?.returns === undefined ? {} : { returns: base.returns }
		return checkedClaims(flat, "") ?? { ...request, allowances: { ...flat.allowances }, ...held }
	}
	for (const [person, claims] of returns) {
		const problem = checkedClaims(claims, person)
		if (problem !== null) return problem
	}
	const holder = returns.get(pair.holder.id)!
	return {
		jurisdiction,
		filingStatus: status,
		children: holder.children,
		childrenAtHigherRate: holder.childrenAtHigherRate,
		allowances: { ...holder.allowances },
		returns: Object.fromEntries(returns),
	}
}

/**
 * The request the flags state over an optional base (cli ADR-0075). A bare value names the holder; a
 * person-qualified one needs `married_separate` with a partner, and is refused otherwise. Each Return's
 * children default to 0. Without such a pair the base's Returns are carried as they are.
 */
export function requestOfClaims(input: {
	status: ThFilingStatus
	couple: Couple | null
	stated: Stated
	base?: TaxRequest | undefined
}): TaxRequest | AppError {
	const pair = input.status === "married_separate" ? input.couple : null
	const refused = checkedPersons(input.stated, pair)
	if (refused !== null) return refused
	const flat = input.base === undefined ? zeroClaims() : claimsOfRequest(input.base)
	const returns = seedReturns(pair, input.base, flat)
	applyStated(input.stated, flat, returns, pair)
	const tooMany = checkedCounts(input.stated, pair === null ? [flat] : [...returns.values()])
	if (tooMany !== null) return tooMany
	const request = assembled(input.status, input.base, flat, returns, pair)
	if ("jurisdiction" in request) {
		const named = namedValues(input.stated, pair)
		if (named.length > 0) request.named = named
	}
	return request
}
