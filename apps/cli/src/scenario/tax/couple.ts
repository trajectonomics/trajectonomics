import type { Household, Person } from "../household/model"

/** The two people a Return can be filed for: the holder first, the partner second. */
export type Couple = { holder: Person; partner: Person }

/** The holder's id, or undefined when the plan has no household. */
export function holderIdOf(stored: string | null): string | undefined {
	if (stored === null) return undefined
	const household = JSON.parse(stored) as Household
	return household.people.find((person) => person.role === "holder")?.id
}

/** The household's holder and partner, or null when it names no partner (cli ADR-0075). */
export function coupleOf(stored: string | null): Couple | null {
	if (stored === null) return null
	const household = JSON.parse(stored) as Household
	const holder = household.people.find((person) => person.role === "holder")
	const partner = household.people.find((person) => person.role === "partner")
	return holder === undefined || partner === undefined ? null : { holder, partner }
}
