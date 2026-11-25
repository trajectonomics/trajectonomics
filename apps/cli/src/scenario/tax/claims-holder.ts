import { claimsOfRequest, zeroClaims } from "./claims-seed"
import type { TaxRequest } from "./flags"

/*
 * The flat claims of a profile are one person's, and `claimsHolder` records whose (cli ADR-0075).
 * "The holder" is a role the household can give the other person, and without the record the new
 * holder would take the old one's claims while the old one kept theirs: one claim on two Returns.
 */

/**
 * The profile with the flat claims handed to `holder`: the recorded person's go to their entry in
 * `returns`, and the flat keys take the holder's entry, or nothing. A profile that records nobody, or
 * records this holder, or a plan with no holder, is left as it is.
 */
export function claimsHeldBy(profile: TaxRequest, holder: string | undefined): TaxRequest {
	const recorded = profile.claimsHolder
	if (holder === undefined || recorded === undefined || recorded === holder) return profile
	const { [holder]: own = zeroClaims(), ...others } = profile.returns ?? {}
	return {
		...profile,
		...claimsOfRequest(own),
		claimsHolder: holder,
		returns: { ...others, [recorded]: claimsOfRequest(profile) },
	}
}
