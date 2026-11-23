import { addDays } from "../calendar/arith"
import { daysInMonth, formatDate, parseDate } from "../calendar/civil"
import type { DateString } from "../types"

/** A calendar month, or the part of one that a statement covers. */
export interface StatementPeriod {
	readonly from: DateString
	readonly to: DateString
	readonly partial: boolean
}

function monthStart(date: DateString): DateString {
	const { year, month } = parseDate(date)
	return formatDate({ year, month, day: 1 })
}

function monthEnd(date: DateString): DateString {
	const { year, month } = parseDate(date)
	return formatDate({ year, month, day: daysInMonth(year, month) })
}

/**
 * Calendar months from `start` to `end`, cut at both ends. A period is partial when a cut edge
 * shortens it, or when `runsOut` ends it, as the annual roll-ups are.
 */
export function statementPeriods(
	start: DateString,
	end: DateString,
	runsOut: DateString | undefined,
): readonly StatementPeriod[] {
	const periods: StatementPeriod[] = []
	let from = start
	while (true) {
		const last = monthEnd(from)
		const to = end < last ? end : last
		const partial = from !== monthStart(from) || to !== last || to === runsOut
		periods.push({ from, to, partial })
		if (to === end) return periods
		from = addDays(to, 1)
	}
}
