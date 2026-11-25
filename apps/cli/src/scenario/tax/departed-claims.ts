import type { Household } from "../household/model"
import type { TaxRequest } from "./flags"

/*
 * A person given a new id reads as another person (cli ADR-0075). The profile keeps what was claimed
 * under the old id and no Return carries it, so the tax leaves it out. A write says so in
 * `unclaimed`, beside the other claims it keeps: it is a note, not one of tax-core's figures.
 */

/**
 * The ids under which the profile keeps claims that no person in the household has, in order.
 * `kept` keeps a set for a person with no Return only when it claims something. A plan with no
 * household to judge by gives none.
 */
export function departedClaimants(kept: TaxRequest, household: string | null): string[] {
	if (household === null) return []
	const { people } = JSON.parse(household) as Household
	const present = new Set(people.map((person) => person.id))
	return Object.keys(kept.returns ?? {})
		.filter((id) => !present.has(id))
		.sort()
}

/**
 * The sentence for one such id. No Return of any filing status counts the stored set, so it does not
 * say the set waits for a separate filing. A set whose claims were stated again under a person in
 * the household stays behind, so the sentence names the one write that drops it.
 */
export function departedClaims(id: string): string {
	return `The claims stored for ${JSON.stringify(id)}, who is not in the household, are on no Return. State any that still apply for a person in the household; if those claims are already stated for another person, a --tax write drops this set. scenario show lists them under returns until then.`
}
