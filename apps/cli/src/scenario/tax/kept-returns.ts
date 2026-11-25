import { ALLOWANCE_FLAGS } from "./allowances"
import type { FilerScope } from "./filer-scope"
import type { ReturnClaims, TaxRequest } from "./flags"

/** Whether a Return claims nothing, so leaving it out loses no figure. */
function claimsNothing(claims: ReturnClaims): boolean {
	const counts = [claims.children, claims.childrenAtHigherRate]
	return [...counts, ...ALLOWANCE_FLAGS.map((field) => claims.allowances[field])].every(
		(value) => value === 0,
	)
}

/**
 * The request as the profile keeps it (cli ADR-0075): one claim set per Filer of a separate Return,
 * and what the household's partner claimed before, so a later separate filing has it back. Nobody
 * else's is kept: the flat claims are the holder's, and an entry kept for them would outlast what the
 * caller changes there. A claim set of nothing for a person with no Return is left out, so a plan that
 * never filed separately stores what it always did.
 */
export function keptRequest(
	request: TaxRequest,
	scope: FilerScope | null,
	partner: string | undefined,
): TaxRequest {
	const { returns, named: _named, ...flat } = request
	const filers = scope?.kind === "separate" ? scope.filers : []
	const kept = Object.entries(returns ?? {}).filter(
		([person, claims]) => filers.includes(person) || (person === partner && !claimsNothing(claims)),
	)
	return kept.length === 0 ? flat : { ...flat, returns: Object.fromEntries(kept) }
}
