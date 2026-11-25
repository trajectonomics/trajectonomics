import { ALLOWANCE_FLAGS } from "./allowances"
import type { FilerScope } from "./filer-scope"
import type { ReturnClaims, TaxRequest } from "./flags"

/** Whether a Return claims nothing, so leaving it out loses no figure. */
export function claimsNothing(claims: ReturnClaims): boolean {
	const counts = [claims.children, claims.childrenAtHigherRate]
	return [...counts, ...ALLOWANCE_FLAGS.map((field) => claims.allowances[field])].every(
		(value) => value === 0,
	)
}

/**
 * The request as the profile keeps it (cli ADR-0075). `claimsHolder` names whose the flat claims are:
 * as the request carries it, else the holder of a Return with Filers, so a plan that never had Filers
 * records nobody. `returns` holds one claim set per Filer of a separate Return, and every other
 * person's that claims something, so a later separate filing has it back; the person the flat claims
 * are needs no entry. A claim set of nothing for a person with no Return is left out.
 */
export function keptRequest(
	request: TaxRequest,
	scope: FilerScope | null,
	holder: string | undefined,
): TaxRequest {
	const { returns, named: _named, ...flat } = request
	const claimsHolder = request.claimsHolder ?? (scope === null ? undefined : holder)
	const inFlat = claimsHolder ?? holder
	const filers = scope?.kind === "separate" ? scope.filers : []
	const kept = Object.entries(returns ?? {}).filter(
		([person, claims]) => filers.includes(person) || (person !== inFlat && !claimsNothing(claims)),
	)
	return {
		...flat,
		...(claimsHolder === undefined ? {} : { claimsHolder }),
		...(kept.length === 0 ? {} : { returns: Object.fromEntries(kept) }),
	}
}
