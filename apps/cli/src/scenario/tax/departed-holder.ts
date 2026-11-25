import type { AssumptionView } from "../../tax-assumptions"
import type { Household } from "../household/model"
import { ownEntry } from "./claims-seed"
import type { TaxRequest } from "./flags"
import { parsedTax } from "./stored"

/*
 * A person given a new id reads as another person (cli ADR-0075). When that is the one the flat claims
 * are recorded for, a separate filing keeps the claims under the old id and no Return carries them, so
 * the tax leaves them out and the result says so.
 */

/**
 * The stored profile's `claimsHolder` whose claims this write took off every Return: the household
 * names no such person, and the written request keeps a claim set under their id. It keeps one only
 * when it claims something and the flat claims are no longer theirs, so a write that still counts them
 * on its one Return, and a plan with no household to judge by, give none.
 */
export function departedHolderOf(
	stored: string | null,
	household: string | null,
	written: TaxRequest,
): string | undefined {
	const recorded = parsedTax(stored)?.claimsHolder
	if (recorded === undefined || household === null) return undefined
	const { people } = JSON.parse(household) as Household
	if (people.some((person) => person.id === recorded)) return undefined
	return ownEntry(written.returns, recorded) === undefined ? undefined : recorded
}

/** The entry that says those claims are not counted: its value is what the Returns count of them. */
export function departedHolderAssumption(person: string): AssumptionView {
	return {
		path: "claimsHolder",
		value: 0,
		status: "unsourced",
		note: `The claims stored for ${JSON.stringify(person)}, who is not in the household, are not counted on any Return until they are stated again, for example with --tax or <person>=<value> flags. scenario show lists them under returns.`,
	}
}
