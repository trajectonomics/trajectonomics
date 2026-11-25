import type { AssumptionView } from "../../tax-assumptions"
import type { Household } from "../household/model"
import { taxAssumptionsOf } from "./assumptions"
import type { TaxRequest } from "./flags"
import type { TaxLevyWritten } from "./levy"

/*
 * A person given a new id reads as another person (cli ADR-0075). A separate filing keeps what was
 * claimed under the old id and no Return carries it, so the tax leaves it out. Every such write says
 * so, in its own entry beside tax-core's figures.
 */

/**
 * The ids under which a separate filing's profile keeps claims that no person in the household has, in
 * order. `keptRequest` keeps a set for a person with no Return only when it claims something. A joint
 * or single write, and a plan with no household to judge by, give none.
 */
export function departedClaimants(kept: TaxRequest, household: string | null): string[] {
	if (kept.filingStatus !== "married_separate" || household === null) return []
	const { people } = JSON.parse(household) as Household
	const present = new Set(people.map((person) => person.id))
	return Object.keys(kept.returns ?? {})
		.filter((id) => !present.has(id))
		.sort()
}

/** The entry for one such id: its value is what the Returns count of those claims. */
function departedEntry(id: string, hasFilers: boolean): AssumptionView {
	// A write with no Filers refuses a person-qualified value, so it is not offered one.
	const how = hasFilers ? "--tax or <person>=<value> flags" : "--tax"
	return {
		path: `returns.${id}`,
		value: 0,
		status: "unsourced",
		note: `The claims stored for ${JSON.stringify(id)}, who is not in the household, are not counted on any Return. State any that still apply again, for example with ${how}. scenario show lists them under returns, where they stay until a --tax write replaces the profile.`,
	}
}

/** What a write that wrote a Levy assumes: the Levies' figures, then each departed id's claims. */
export function writtenAssumptions(made: TaxLevyWritten): AssumptionView[] {
	const hasFilers = made.filers !== undefined
	return [
		...taxAssumptionsOf(made.document, made.ceilingNotes),
		...made.departed.map((id) => departedEntry(id, hasFilers)),
	]
}
