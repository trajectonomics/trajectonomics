import type { FilerScope } from "./filer-scope"
import type { TaxRequest } from "./flags"
import { claimsNothing } from "./kept-returns"

/*
 * What the profile a write keeps holds and none of its Returns claims (cli ADR-0075). A result says it
 * in `unclaimed`, apart from `assumptions`, which are tax-core's figures.
 */

/** The sentence for shared interest the profile keeps while no separate Return claims it. */
function sharedUnclaimed(amount: number): string {
	return `${amount.toLocaleString("en-US")} baht of shared home-loan interest is stored for separate Returns, and this Return does not claim it. To state this Return's interest, use --mortgage-interest <amount> --merge; it replaces the stored mortgageInterest, which a later separate filing reads as one person's own, so state that again then.`
}

/** The sentence for the claims of other people the profile keeps while no separate Return is written. */
function claimsUnclaimed(persons: readonly string[]): string {
	const names = persons.map((person) => `"${person}"`).join(" and ")
	return `The claims stored for ${names} are kept for a separate filing, and this Return does not claim them. To claim them on this Return, state them bare with --merge.`
}

/** The sentence for a person whose claims a separate filing keeps and writes no Return for. */
function noReturn(person: string): string {
	return `"${person}" has no taxed income in this plan, so no Return claims their stored claims.`
}

/**
 * One sentence per thing left unclaimed. A separate filing with Filers names each other person who
 * claims something, read from the request: its `returns` still holds the holder's entry, which the kept
 * profile states as the flat claims. Any other write names what the kept profile holds for a separate
 * filing, where every entry of `returns` claims something and is not the flat claims' person's
 * (`keptRequest`).
 */
export function unclaimedClaims(
	request: TaxRequest,
	kept: TaxRequest,
	scope: FilerScope | null,
): string[] {
	if (scope?.kind === "separate") {
		return Object.entries(request.returns ?? {})
			.filter(([person, claims]) => !scope.filers.includes(person) && !claimsNothing(claims))
			.map(([person]) => noReturn(person))
	}
	const shared = kept.sharedMortgageInterest ?? 0
	const persons = Object.keys(kept.returns ?? {})
	return [
		...(shared > 0 ? [sharedUnclaimed(shared)] : []),
		...(persons.length > 0 ? [claimsUnclaimed(persons)] : []),
	]
}
