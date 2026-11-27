import { formatDate, parseDate } from "../calendar/civil"
import type { ChanceMilestone, ChanceMilestoneDate, ChanceMilestoneYear } from "../types"
import type { DateString } from "../types/common"
import { BAND_LEVELS } from "./band"
import type { PathOutcome } from "./path-outcome"
import { ascending, nearestRank } from "./rank"

const MONTHS = 12

/** A date's calendar month on the grid, as `year × 12 + month − 1`. */
function monthOrdinal(date: DateString): number {
	const { year, month } = parseDate(date)
	return year * MONTHS + (month - 1)
}

/** The first day of the month an ordinal names. */
function monthStart(ordinal: number): DateString {
	return formatDate({ year: Math.floor(ordinal / MONTHS), month: (ordinal % MONTHS) + 1, day: 1 })
}

/** The fire dates of one Milestone across the paths that fired it. */
function fireDates(id: string, outcomes: readonly PathOutcome[]): DateString[] {
	const dates: DateString[] = []
	for (const outcome of outcomes) {
		for (const result of outcome.milestones ?? []) {
			if (result.id === id && result.reached) dates.push(result.date)
		}
	}
	return dates
}

/** The five nearest-rank Percentiles of the fired dates, each reported as its month's first day. */
function datesOf(fired: readonly DateString[]): ChanceMilestoneDate[] {
	if (fired.length === 0) return []
	const sorted = ascending(fired.map(monthOrdinal))
	return BAND_LEVELS.map((level) => ({ level, date: monthStart(nearestRank(sorted, level)) }))
}

/** The fired paths per calendar year, ascending, leaving out years with none. */
function byYear(fired: readonly DateString[]): ChanceMilestoneYear[] {
	const counts = new Map<number, number>()
	for (const date of fired) {
		const year = parseDate(date).year
		counts.set(year, (counts.get(year) ?? 0) + 1)
	}
	return [...counts.entries()]
		.sort((left, right) => left[0] - right[0])
		.map(([year, paths]) => ({ year, paths }))
}

/** The report of one Milestone over the paths that fired it. */
export function milestoneSummary(id: string, fired: readonly DateString[]): ChanceMilestone {
	return { id, reached: fired.length, dates: datesOf(fired), byYear: byYear(fired) }
}

/** One report per Milestone, in Scenario order, from the same run that fed the Bands (ADR 0011). */
export function milestoneSummaries(
	ids: readonly string[],
	outcomes: readonly PathOutcome[],
): readonly ChanceMilestone[] {
	return ids.map((id) => milestoneSummary(id, fireDates(id, outcomes)))
}
