/**
 * A viewing month, `YYYY-MM`, worked out from its year and its month only (web ADR 0033). No `Date`, no clock:
 * every function adds integers and reads or writes text.
 */
import { addMonths, monthEnd } from "../../snapshot/dates"

/** A month is exactly a four-digit year, a dash, and 01 to 12. */
const MONTH_SHAPE = /^(\d{4})-(0[1-9]|1[0-2])$/

/** The month a text is, or null for anything else: an empty string, `2026-13`, `life` and a full date are no month. */
export function parseMonth(text: string): string | null {
	return MONTH_SHAPE.test(text) ? text : null
}

/** The month a date falls in, read as text: `2026-10-31` and `2026-10` both become `2026-10`. */
export function monthOf(date: string): string {
	return date.slice(0, 7)
}

/** Moves a month by a whole number of months, which may be negative: `2026-10` by 3 is `2027-01`. */
export function addMonthsTo(month: string, count: number): string {
	const match = MONTH_SHAPE.exec(month)
	if (!match) return month
	const [year, next] = addMonths(Number(match[1]), Number(match[2]), count)
	return `${String(year).padStart(4, "0")}-${String(next).padStart(2, "0")}`
}

/** The whole months from one month to another: 0 for the same month, negative when `to` is the earlier one. */
export function monthsBetween(from: string, to: string): number {
	const start = MONTH_SHAPE.exec(from)
	const end = MONTH_SHAPE.exec(to)
	if (!start || !end) return 0
	return Number(end[1]) * 12 + Number(end[2]) - (Number(start[1]) * 12 + Number(start[2]))
}

/** The first day of a month, as the CLI writes a date. */
export function firstDayOf(month: string): string {
	return `${month}-01`
}

/** The last day of a month: `2028-02` becomes `2028-02-29`. */
export function lastDayOf(month: string): string {
	const match = MONTH_SHAPE.exec(month)
	if (!match) return month
	return monthEnd(Number(match[1]), Number(match[2]))
}
