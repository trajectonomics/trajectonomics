import { daysInMonth } from "../snapshot/dates"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH = /^(\d{4})-(\d{2})$/

interface CalendarDate {
	readonly year: number
	readonly month: number
	readonly day: number
}

/** Reads a YYYY-MM-DD string into its parts, or returns null when it is not a real calendar day. */
function parseDate(date: string): CalendarDate | null {
	const match = DATE.exec(date)
	if (!match) return null
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
	return { year, month, day }
}

/** A calendar date as the Dashboard prints it: "2026-10-31" becomes "31 Oct 2026". */
export function formatDate(date: string): string {
	const parts = parseDate(date)
	if (!parts) return date
	return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`
}

/**
 * A period as a page names it: a whole calendar year is its year ("2026"), and any other period is its range
 * ("1 Apr 2026 – 31 Mar 2027"). The dates are compared as the CLI wrote them; nothing is worked out.
 */
export function periodWords(start: string, end: string): string {
	const from = DATE.exec(start)
	const to = DATE.exec(end)
	const wholeYear =
		from !== null &&
		to !== null &&
		from[1] === to[1] &&
		from[2] === "01" &&
		from[3] === "01" &&
		to[2] === "12" &&
		to[3] === "31"
	return wholeYear ? (from[1] ?? start) : `${formatDate(start)} – ${formatDate(end)}`
}

/** The year of a date, read as text: "2053-12-31" becomes "2053". The CLI's date, not a calendar computation. */
export function yearOf(date: string): string {
	return date.slice(0, 4)
}

/** The month of a calendar date or a month: "2026-10-31" and "1990-06" become "Oct 2026" and "Jun 1990". */
export function formatMonth(date: string): string {
	const parts = parseDate(date)
	if (parts) return `${MONTHS[parts.month - 1]} ${parts.year}`
	const month = MONTH.exec(date)
	if (!month) return date
	const number = Number(month[2])
	if (number < 1 || number > 12) return date
	return `${MONTHS[number - 1]} ${month[1]}`
}
