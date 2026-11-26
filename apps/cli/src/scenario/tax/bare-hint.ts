import { exampleFlagsOf } from "./example-flag"
import type { FilerScope } from "./filer-scope"
import type { ReturnClaims, TaxRequest } from "./flags"

/*
 * How a Return that may claim both spouses' claims says another person's kept claims are stated bare
 * (cli ADR-0075). The caveat names whose flat claims that replaces and the command that states them
 * again, so a later separate filing keeps its tax.
 */

/** The words when no Return of this write is the flat claims' person's, so no example flag applies. */
const OLDER = "so state the holder's own claims again when switching back."

/** The old sentence, byte for byte, for when the caveat can name nobody or no claim to state. */
const GENERIC = ` If this Return does not claim them yet, state them bare with --merge: that replaces the stored flat claims, which a later separate filing reads as the holder's own, ${OLDER}`

/**
 * The person the caveat may name: whose claims the flat keys are (`claimsHolder`, else the
 * household's holder), when this write has a Return for them. A person with no taxed income takes no
 * person-qualified value, so naming them would print a flag the CLI refuses.
 */
export function caveatPerson(
	kept: TaxRequest,
	scope: FilerScope | null,
	holder: string | undefined,
): string | undefined {
	const person = kept.claimsHolder ?? holder
	return person === undefined || !scope?.filers.includes(person) ? undefined : person
}

/**
 * How a Return that may claim both spouses' claims states another person's kept claims bare, and what
 * that leaves a later separate filing. The first clause is conditional, so the sentence stays true
 * once followed. The caveat gives the switch-back command in full, because a person-qualified value
 * needs a separate filing, with a flag for every claim the kept sets hold and, when the profile keeps
 * shared interest, the person's own mortgage interest. It says to read the person's own claims before
 * stating them bare, because that bare write replaces the stored flat claims.
 */
export function bareHint(
	claims: readonly ReturnClaims[],
	person: string | undefined,
	shared: number,
): string {
	if (person === undefined) return GENERIC
	const example = exampleFlagsOf(claims, person, shared > 0 ? ["mortgageInterest"] : [])
	if (example === undefined) return GENERIC
	const name = JSON.stringify(person)
	return ` If this Return does not claim them yet, state them bare with --merge: that replaces the stored flat claims, which a later separate filing reads as ${name}'s own, so before you do, note ${name}'s own claims from scenario show, and state those again when switching back, for example --filing-status married_separate ${example} --merge.`
}
