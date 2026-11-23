import type { HouseholdDocument, HouseholdPerson, ProjectionRun } from "../../contract"
import { formatDate } from "../../format"
import { annualRowsOf } from "../projection/annual"
import type { DateChoice } from "./dates"
import { estateRowsOf, rowOn } from "./rows"

/** The value of the later-life-expectancy choice, the page's default when the household names an adult. */
export const LIFE = "life"

/** The people the estate passes from: the account holder and a partner, not a dependent. */
function adults(household: HouseholdDocument | null): HouseholdPerson[] {
	return (household?.people ?? []).filter((person) => person.role !== "dependent")
}

/** The roll-up end where the person's age first reaches their life expectancy, as the CLI states the row; null when it never does. */
function lifeEndOf(run: ProjectionRun, person: HouseholdPerson): string | null {
	const row = annualRowsOf(run).find((one) =>
		one.ages.some((age) => age.person === person.id && age.age >= person.lifeExpectancy),
	)
	return row?.to ?? null
}

/** Said when the household names no adult: the date cannot be a life expectancy. */
export const NO_ADULT_NOTE =
	"The household names no adult, so there is no life expectancy to read and the plan's last year is shown."

/** The life-expectancy choices: each adult, and the later one as the default. */
export function lifeChoices(
	run: ProjectionRun,
	household: HouseholdDocument | null,
	lastDate: string,
): { choices: DateChoice[]; beyond: string | null } {
	const people = adults(household)
	const ends = people.map((person) => ({ person, date: lifeEndOf(run, person) }))
	const reached = ends.flatMap((one) => (one.date === null ? [] : [{ ...one, date: one.date }]))
	const single = people.length === 1
	// A choice is worded with the estate row's own date, the one the table and the headline show.
	const rowDate = (date: string): string => formatDate(rowOn(estateRowsOf(run), date)?.date ?? date)
	const each = reached.map(({ person, date }) => ({
		value: `person:${person.id}`,
		label: `${person.id} at life expectancy, age ${person.lifeExpectancy} (${rowDate(date)})`,
		date,
	}))
	if (people.length === 0) return { choices: [], beyond: NO_ADULT_NOTE }
	const missing = ends.filter((one) => one.date === null).map((one) => one.person.id)
	if (missing.length > 0) {
		const names = missing.join(" and ")
		return {
			choices: [
				{ value: LIFE, label: `Later life expectancy, after the plan ends`, date: lastDate },
				...each,
			],
			beyond: `Your plan ends on ${formatDate(lastDate)}, before ${names} reach${missing.length === 1 ? "es" : ""} the life expectancy set in the household, so the plan's last year is shown.`,
		}
	}
	const later = reached.reduce((best, one) => (one.date > best.date ? one : best))
	const label = `${single ? "Life expectancy" : "Later life expectancy"}: ${later.person.id}, age ${later.person.lifeExpectancy} (${rowDate(later.date)})`
	return { choices: [{ value: LIFE, label, date: later.date }, ...each], beyond: null }
}
