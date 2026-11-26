import { departedClaims } from "./departed-claims"
import { exampleFlagOf } from "./example-flag"
import type { FilerScope } from "./filer-scope"
import type { ReturnClaims, TaxRequest } from "./flags"
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
 * that leaves a later separate filing. The first clause is conditional, so the sentence stays true
 * once followed. The caveat names the holder and a kept claim's flag when the household names one,
 * because only the caller knows the holder's own values.
 */
function bareHint(claims: readonly ReturnClaims[], holder: string | undefined): string {
	const back =
		holder === undefined
			? "so state the holder's own claims again when switching back."
			: `so state ${JSON.stringify(holder)}'s own claims again when switching back, for example ${exampleFlagOf(claims, holder)} --merge.`
	return ` If this Return does not claim them yet, state them bare with --merge: that replaces the stored flat claims, which a later separate filing reads as the holder's own, ${back}`
}

/** The sentence for the claims of other people the profile keeps while no separate Return is written. */
function claimsUnclaimed(
	persons: readonly string[],
	claims: readonly ReturnClaims[],
	hint: boolean,
	holder: string | undefined,
): string {
	const names = persons.map((person) => `"${person}"`).join(" and ")
	const kept = `The claims stored for ${names} are kept for a separate filing, and this Return does not claim them.`
	return hint ? kept + bareHint(claims, holder) : kept
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
 * (`keptRequest`). A departed id is named once, from `departed`, with the flag a write with Filers takes.
 */
export function unclaimedClaims(
	request: TaxRequest,
	kept: TaxRequest,
	scope: FilerScope | null,
	departed: readonly string[],
	holder: string | undefined,
): string[] {
	const gone = departed.map((id) => departedClaims(id, kept.returns?.[id], holder, scope !== null))
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
	const keptSets = Object.entries(kept.returns ?? {}).filter(([id]) => !departed.includes(id))
	const hint = mayHint(request.filingStatus)
	return [
		...(shared > 0 ? [sharedUnclaimed(shared)] : []),
		...(keptSets.length > 0
			? [
					claimsUnclaimed(
						keptSets.map(([id]) => id),
						keptSets.map(([, claims]) => claims),
						hint,
						holder,
					),
				]
			: []),
		...gone,
	]
}
