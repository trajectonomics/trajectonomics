import { addMonths, daysInMonth, formatDate, parseDate } from "../../snapshot/dates"

/**
 * The day one calendar month before a YYYY-MM-DD date, on the string itself: a day that the earlier month
 * does not hold falls on its last day. Pure: no clock, no `Date`.
 */
export function monthBefore(date: string): string {
	const parts = parseDate(date)
	if (parts === null) throw new RangeError(`not a YYYY-MM-DD date: ${date}`)
	const [year, month] = addMonths(parts.year, parts.month, -1)
	return formatDate(year, month, Math.min(parts.day, daysInMonth(year, month)))
}
