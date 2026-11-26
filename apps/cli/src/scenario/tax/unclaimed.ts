import { bareHint, caveatPerson } from "./bare-hint"
import { departedClaims } from "./departed-claims"
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

/** The sentence for the claims of other people the profile keeps while no separate Return is written. */
function claimsUnclaimed(
	persons: readonly string[],
	claims: readonly ReturnClaims[],
	hint: boolean,
	person: string | undefined,
): string {
	const names = persons.map((name) => `"${name}"`).join(" and ")
	const kept = `The claims stored for ${names} are kept for a separate filing, and this Return does not claim them.`
	return hint ? kept + bareHint(claims, person) : kept
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
 * (`keptRequest`). A departed id is named once, from `departed`, with the flag a separate write takes.
 */
export function unclaimedClaims(
	request: TaxRequest,
	kept: TaxRequest,
	scope: FilerScope | null,
	departed: readonly string[],
	holder: string | undefined,
): string[] {
	const gone = departed.map((id) =>
		departedClaims(id, kept.returns?.[id], scope?.kind === "separate"),
	)
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
	const person = caveatPerson(kept, scope, holder)
	return [
		...(shared > 0 ? [sharedUnclaimed(shared)] : []),
		...(keptSets.length > 0
			? [
					claimsUnclaimed(
						keptSets.map(([id]) => id),
						keptSets.map(([, claims]) => claims),
						hint,
						person,
					),
				]
			: []),
		...gone,
	]
}
