import { departedClaims } from "./departed-claims"
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

/**
 * How a Return that may claim both spouses' claims states another person's kept claims bare, and what
 * that leaves a later separate filing. The write cannot tell whether it has been followed, so the
 * first clause is conditional: the sentence stays true once the claims have been stated.
 */
const BARE_HINT =
	" If this Return does not claim them yet, state them bare with --merge: that replaces the stored flat claims, which a later separate filing reads as the holder's own, so state the holder's own claims again when switching back."

/** The sentence for the claims of other people the profile keeps while no separate Return is written. */
function claimsUnclaimed(persons: readonly string[], hint: boolean): string {
	const names = persons.map((person) => `"${person}"`).join(" and ")
	const kept = `The claims stored for ${names} are kept for a separate filing, and this Return does not claim them.`
	return hint ? kept + BARE_HINT : kept
}

/** The sentence for a person whose claims a separate filing keeps and writes no Return for. */
function noReturn(person: string): string {
	return `"${person}" has no taxed income in this plan, so no Return claims their stored claims.`
}

/**
 * Whether one Return may claim both people's claims: joint and no-income-spouse count each spouse's
 * parents, while single and separate count only the Filer's own, and the bare count form bypasses
 * tax-core's refusal of a spouse slot on those. So the hint is unsafe outside the two.
 */
function mayHint(status: TaxRequest["filingStatus"]): boolean {
	return status === "married_joint" || status === "married_no_income_spouse"
}

/**
 * One sentence per thing left unclaimed. A separate filing with Filers names each other person who
 * claims something, read from the request: its `returns` still holds the holder's entry, which the kept
 * profile states as the flat claims. Any other write names what the kept profile holds for a separate
 * filing, where every entry of `returns` claims something and is not the flat claims' person's
 * (`keptRequest`). A departed id is left out of both branches and named once, from `departed`.
 */
export function unclaimedClaims(
	request: TaxRequest,
	kept: TaxRequest,
	scope: FilerScope | null,
	departed: readonly string[],
): string[] {
	const gone = departed.map(departedClaims)
	if (scope?.kind === "separate") {
		const noIncome = Object.entries(request.returns ?? {})
			.filter(
				([person, claims]) =>
					!scope.filers.includes(person) && !departed.includes(person) && !claimsNothing(claims),
			)
			.map(([person]) => noReturn(person))
		return [...noIncome, ...gone]
	}
	const shared = kept.sharedMortgageInterest ?? 0
	const persons = Object.keys(kept.returns ?? {}).filter((id) => !departed.includes(id))
	const hint = mayHint(request.filingStatus)
	return [
		...(shared > 0 ? [sharedUnclaimed(shared)] : []),
		...(persons.length > 0 ? [claimsUnclaimed(persons, hint)] : []),
		...gone,
	]
}
