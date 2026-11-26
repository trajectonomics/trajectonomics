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
