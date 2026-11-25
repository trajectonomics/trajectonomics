import type { CompoundingPeriod, DateString } from "../types"
import { addDays } from "./arith"
import { landedDate, type ResolvedCalendar, shiftBound } from "./business"
import { compoundingDate } from "./compounding"
import type { Occurrence } from "./occurrence"

/** The last day of each calendar period from the one containing `first` through `last`. */
function periodEnds(
	first: DateString,
	period: CompoundingPeriod,
	last: DateString,
): readonly DateString[] {
	const ends: DateString[] = []
	let due = compoundingDate(first, period)
	while (due <= last) {
		ends.push(due)
		const next = addDays(due, 1)
		if (next === due) break
		due = compoundingDate(next, period)
	}
	return ends
}

/** The Due dates on their Landed dates inside `[from, to]`, one Occurrence a date. */
function landed(
	ends: readonly DateString[],
	from: DateString,
	to: DateString,
	calendar: ResolvedCalendar | undefined,
): readonly Occurrence[] {
	const found: Occurrence[] = []
	for (const due of ends) {
		const date = landedDate(due, calendar)
		if (date > to) break
		if (date >= from && found[found.length - 1]?.date !== date) found.push({ date, years: 0 })
	}
	return found
}

/**
 * The payout Occurrences in `[from, to]`: the last day of each calendar period whose Due date lies in
 * `start..end` (inclusive), on its Landed date, like Compounding dates and independent of the Timeline
 * start. A Landed date another payout already took is skipped, so one date pays at most once.
 */
export function payoutOccurrences(
	start: DateString,
	period: CompoundingPeriod,
	end: DateString | undefined,
	from: DateString,
	to: DateString,
	calendar: ResolvedCalendar | undefined,
): readonly Occurrence[] {
	if (to < from) return []
	const earliest = addDays(from, -shiftBound(calendar))
	const last = end !== undefined && end < to ? end : to
	return landed(periodEnds(start > earliest ? start : earliest, period, last), from, to, calendar)
}
