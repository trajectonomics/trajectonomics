import type { Household } from "../household/model"
import { exampleFlagOf } from "./example-flag"
import type { ReturnClaims, TaxRequest } from "./flags"

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
 * the household stays behind, so the sentence names the one write that drops it. A write with Filers
 * shows the person-keyed flag that restates the claims, which a write without one refuses.
 */
export function departedClaims(
	id: string,
	claims: ReturnClaims | undefined,
	holder: string | undefined,
	hasFilers: boolean,
): string {
	const how =
		hasFilers && holder !== undefined && claims !== undefined
			? `, for example with "<person>=<value>" flags such as ${exampleFlagOf([claims], holder)}, or with --tax`
			: ""
	return `The claims stored for ${JSON.stringify(id)}, who is not in the household, are on no Return. State any that still apply for a person in the household${how}; if those claims are already stated for another person, a --tax write drops this set. scenario show lists them under returns until then.`
}
