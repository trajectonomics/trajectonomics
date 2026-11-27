import { type AppError, isAppError } from "../../errors"
import { storedHousehold } from "../household/stored"
import { exampleFlagsOf } from "./example-flag"
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
export function departedClaimants(kept: TaxRequest, household: string | null): string[] | AppError {
	if (household === null) return []
	const stored = storedHousehold(household)
	if (isAppError(stored)) return stored
	const present = new Set(stored.people.map((person) => person.id))
	return Object.keys(kept.returns ?? {})
		.filter((id) => !present.has(id))
		.sort()
}

/**
 * The sentence for one such id. No Return of any filing status counts the stored set, so it does not
 * say the set waits for a separate filing. A set whose claims were stated again under a person who
 * has a Return stays behind, so the sentence names the one write that drops it. A separate write with
 * Filers shows a person-keyed flag for every claim it holds, under a `<person>` placeholder: the old
 * id may have become any person in the household, and any other status refuses the flag. The example
 * names the filing status too, so it also runs while the stored plan is still joint, and uses the
 * `--flag=<person>=<value>` form, which takes any id. Without an example the words are the ones a
 * write without Filers always gave.
 */
export function departedClaims(
	id: string,
	claims: ReturnClaims | undefined,
	separate: boolean,
): string {
	const example =
		separate && claims !== undefined ? exampleFlagsOf([claims], "<person>", [], true) : undefined
	const how =
		example === undefined
			? ""
			: `, for example with "<person>=<value>" flags such as --filing-status married_separate ${example} --merge`
	const who = example === undefined ? "a person in the household" : "a person who has a Return"
	return `The claims stored for ${JSON.stringify(id)}, who is not in the household, are on no Return. State any that still apply for ${who}${how}; if those claims are already stated for another person, a --tax write drops this set. scenario show lists them under returns until then.`
}
