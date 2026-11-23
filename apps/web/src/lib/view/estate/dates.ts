/**
 * The dates the Estate page can read, and the one it opens on. A date is a choice among dates the CLI already stated: a
 * roll-up end where a person's age reaches their life expectancy (from the run's own `ages`), a reached Milestone, a
 * household anchor's date as the document holds it, and the plan's last year. The page computes no date and no age
 * (web ADR 0002, cli ADR-0048); it compares the CLI's integers and its date text.
 */
import type { HouseholdDocument, ProjectionRun, ScenarioDocument } from "../../contract"
import { formatDate } from "../../format"
import { milestoneView } from "../milestones/milestones"
import { anchorChoices } from "./anchors"
import { LIFE, lifeChoices } from "./life"
import { estateRowsOf } from "./rows"

/** One date the page offers: the value the address holds, the words the person reads and the date it reads. */
export interface DateChoice {
	readonly value: string
	readonly label: string
	readonly date: string
}

/** The choices, the one in use, and why the default is not the life expectancy when it cannot be. */
export interface EstateDates {
	readonly choices: readonly DateChoice[]
	readonly chosen: DateChoice
	/** A sentence when the last year is shown instead of a life expectancy: the plan ends first, or the household names no adult. */
	readonly beyond: string | null
}

export const END = "end"

/** The reached Milestones of the run that fall inside the plan, in date order. */
function milestoneChoices(run: ProjectionRun, lastDate: string): DateChoice[] {
	return (milestoneView(run)?.reached ?? [])
		.filter((one) => one.date <= lastDate)
		.map((one) => ({
			value: `milestone:${one.id}`,
			label: `When ${one.id} fires (${formatDate(one.date)})`,
			date: one.date,
		}))
}

/**
 * The dates of a run, and the one the address asks for. The default is the later life expectancy of the household's
 * adults, or the plan's last year when the household names none or the plan ends first. Null when the run states no estate.
 */
export function estateDates(
	run: ProjectionRun,
	doc: ScenarioDocument,
	household: HouseholdDocument | null,
	requested: string,
): EstateDates | null {
	const lastDate = estateRowsOf(run).at(-1)?.date
	if (lastDate === undefined) return null
	const life = lifeChoices(run, household, lastDate)
	const end: DateChoice = {
		value: END,
		label: `The plan's last year (${formatDate(lastDate)})`,
		date: lastDate,
	}
	const choices = [
		...life.choices,
		...milestoneChoices(run, lastDate),
		...anchorChoices(doc, household, lastDate),
		end,
	]
	const standard = choices.find((one) => one.value === LIFE) ?? end
	const chosen = choices.find((one) => one.value === requested) ?? standard
	return { choices, chosen, beyond: chosen === standard ? life.beyond : null }
}
