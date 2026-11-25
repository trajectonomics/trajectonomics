import { addDays } from "../calendar/arith"
import { daysInMonth, formatDate, parseDate } from "../calendar/civil"
import type { DateString } from "../types"

/** A calendar month, or the part of one that a statement covers. */
export interface StatementMonth {
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
 * Calendar months from `start` to `end`, cut at both ends. A statement month is partial when a cut edge
 * shortens it, or when `runsOut` ends it, as the annual roll-ups are.
 */
export function statementMonths(
	start: DateString,
	end: DateString,
	runsOut: DateString | undefined,
): readonly StatementMonth[] {
	const months: StatementMonth[] = []
	let from = start
	while (true) {
		const last = monthEnd(from)
		const to = end < last ? end : last
		const partial = from !== monthStart(from) || to !== last || to === runsOut
		months.push({ from, to, partial })
		if (to === end) return months
		from = addDays(to, 1)
	}
}
