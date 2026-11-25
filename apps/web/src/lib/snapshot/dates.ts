/** A calendar date split into its parts, with no clock and no `Date`. */
export type YearMonthDay = { year: number; month: number; day: number }

const DATE_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const
/**
 * The number of month-ends a Snapshot's history holds at most: ten years, one `report networth` read each (web ADR 0027).
 * A ledger that reaches back further keeps the latest ten years and the page says so.
 */
export const HISTORY_MONTHS = 120

/** Whether a year is a leap year in the Gregorian calendar. */
export function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** The number of days in a month of a Gregorian year. */
export function daysInMonth(year: number, month: number): number {
	return month === 2 && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0)
}

/** Parses a YYYY-MM-DD date, or returns null for a shape or a day that does not exist. */
export function parseDate(text: string): YearMonthDay | null {
	const match = DATE_SHAPE.exec(text)
	if (!match) return null
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
	return { year, month, day }
}

/** Whether a string is a YYYY-MM-DD date that exists. */
export function isValidDate(text: string): boolean {
	return parseDate(text) !== null
}

/** Formats a year, month and day as YYYY-MM-DD. */
export function formatDate(year: number, month: number, day: number): string {
	const pad = (n: number, width: number) => String(n).padStart(width, "0")
	return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`
}

/** The last day of a month, as YYYY-MM-DD. */
export function monthEnd(year: number, month: number): string {
	return formatDate(year, month, daysInMonth(year, month))
}

/** Moves a year and month by a whole number of months, which may be negative. */
export function addMonths(year: number, month: number, months: number): [number, number] {
	const index = year * 12 + (month - 1) + months
	return [Math.floor(index / 12), (index % 12) + 1]
}

/** The first day of the year that holds a date, as YYYY-MM-DD. */
export function firstDayOfYear(date: string): string {
	const parts = parseDate(date)
	return formatDate(parts?.year ?? 0, 1, 1)
}

/** The first day of the month two months before the month that holds a date, as YYYY-MM-DD. */
export function firstDayTwoMonthsBack(date: string): string {
	const parts = parseDate(date)
	const [year, month] = addMonths(parts?.year ?? 0, parts?.month ?? 1, -2)
	return formatDate(year, month, 1)
}

/**
 * The month-ends from one date to another, both inclusive: each month-end on or after `from` and on
 * or before `to`, in order. Only the latest `cap` are kept.
 */
export function monthEndsBetween(from: string, to: string, cap = HISTORY_MONTHS): string[] {
	const start = parseDate(from)
	const end = parseDate(to)
	if (!start || !end) return []
	const ends: string[] = []
	let [year, month] = [start.year, start.month]
	while (year < end.year || (year === end.year && month <= end.month)) {
		const last = monthEnd(year, month)
		if (last >= from && last <= to) ends.push(last)
		;[year, month] = addMonths(year, month, 1)
	}
	return ends.slice(-cap)
}
