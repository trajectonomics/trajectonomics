import { ageDate, joinsDate, yearOf } from "./dates"
import type { Household, Person } from "./model"

/**
 * A person's age on a date (cli ADR-0048). It reuses the age-to-date rule in `dates.ts`, so an
 * age and its date can never disagree: the age on a date is the largest N whose date is on or
 * before it. Pure arithmetic over ISO dates (YYYY-MM-DD), with no clock.
 */

/** One person's age on a row's date, as `projection run` and `fi` state it. */
export type PersonAge = { person: string; age: number }

/**
 * The largest age N whose date (`ageDate`) is on or before `date`, or null when that age would be
 * negative: the person was not yet at age 0 on `date`, which is the last day of their birth month.
 */
export function ageOn(person: Person, date: string): number | null {
	const years = yearOf(date) - yearOf(person.born)
	// The age that falls in `date`'s own year may land after `date`; the age before it always lands
	// in an earlier year, so it is on or before `date`.
	for (const candidate of [years, years - 1]) {
		if (candidate < 0) return null
		const reached = ageDate(person.born, candidate)
		if (reached !== null && reached <= date) return candidate
	}
	return null
}

/** Whether a person is in the plan on `date`: a partner with a `joins` month is not before its first day. */
function inPlanOn(person: Person, date: string): boolean {
	if (person.role !== "partner" || person.joins === undefined) return true
	const joined = joinsDate(person.joins)
	return joined !== null && joined <= date
}

/**
 * The household's people whose age is set on `date`, in household order. A partner with a `joins`
 * month is absent before its first day; a partner without one is in the plan from the start. A
 * null household has no people, so every result without one carries an empty list.
 */
export function agesOn(household: Household | null, date: string): PersonAge[] {
	if (household === null) return []
	const ages: PersonAge[] = []
	for (const person of household.people) {
		const age = inPlanOn(person, date) ? ageOn(person, date) : null
		if (age !== null) ages.push({ person: person.id, age })
	}
	return ages
}
