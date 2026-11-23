/**
 * The day before a date, and the same day a month later, as text. Calendar arithmetic by whole numbers, never a `Date` or the clock: an
 * asset's running costs and rent end the day before it is sold, so the sale's day is not charged.
 */

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Whether a year has a 29th of February. */
function isLeap(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** The days in a month of a year. */
function daysIn(year: number, month: number): number {
	if (month === 2) return isLeap(year) ? 29 : 28
	return [4, 6, 9, 11].includes(month) ? 30 : 31
}

/** `n` as two digits. */
function two(n: number): string {
	return String(n).padStart(2, "0")
}

/** The day before a YYYY-MM-DD date, or null when the text is not a date of that shape. */
export function dayBefore(date: string): string | null {
	const match = DATE.exec(date)
	if (match === null) return null
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return null
	if (day > 1) return `${match[1]}-${match[2]}-${two(day - 1)}`
	if (month > 1) return `${match[1]}-${two(month - 1)}-${two(daysIn(year, month - 1))}`
	return `${String(year - 1).padStart(4, "0")}-12-31`
}

/** The same day a month later, or the last day of that month when it has none (31 January gives 28 February). Null for a non-date. */
export function monthAfter(date: string): string | null {
	const match = DATE.exec(date)
	if (match === null) return null
	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return null
	const nextYear = month === 12 ? year + 1 : year
	const nextMonth = month === 12 ? 1 : month + 1
	const nextDay = Math.min(day, daysIn(nextYear, nextMonth))
	return `${String(nextYear).padStart(4, "0")}-${two(nextMonth)}-${two(nextDay)}`
}
