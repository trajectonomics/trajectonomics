import type { Household, Person } from "../household/model"

/** The two people a Return can be filed for: the holder first, the partner second. */
export type Couple = { holder: Person; partner: Person }

/** The holder and partner of a parsed household, or null when it names no partner (cli ADR-0075). */
export function coupleIn(household: Household): Couple | null {
	const holder = household.people.find((person) => person.role === "holder")
	const partner = household.people.find((person) => person.role === "partner")
	return holder === undefined || partner === undefined ? null : { holder, partner }
}

/** The holder's id, or undefined when the plan has no household. */
export function holderIdOf(household: Household | null): string | undefined {
	if (household === null) return undefined
	return household.people.find((person) => person.role === "holder")?.id
}

/** The household's holder and partner, or null when it has no partner or no household (cli ADR-0075). */
export function coupleOf(household: Household | null): Couple | null {
	return household === null ? null : coupleIn(household)
}
