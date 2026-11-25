import type { Household, Person } from "../household/model"

/** The two people a Return can be filed for: the holder first, the partner second. */
export type Couple = { holder: Person; partner: Person }

/** The household's holder and partner, or null when it names no partner (cli ADR-0075). */
export function coupleOf(stored: string | null): Couple | null {
	if (stored === null) return null
	const household = JSON.parse(stored) as Household
	const holder = household.people.find((person) => person.role === "holder")
	const partner = household.people.find((person) => person.role === "partner")
	return holder === undefined || partner === undefined ? null : { holder, partner }
}
