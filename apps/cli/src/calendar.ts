/**
 * The Gregorian calendar's two rules, for every date the CLI states by arithmetic (an age date,
 * a month-end). Pure: no clock, no locale, no `Date`, whose two-digit-year rule would misplace a
 * year below 100.
 */

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

/** Whether a Gregorian year is a leap year. */
export function isLeapYear(year: number): boolean {
	return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

/** The days in a month, 1 to 12; 0 for a month outside that range. */
export function daysInMonth(year: number, month: number): number {
	if (month === 2 && isLeapYear(year)) return 29
	return MONTH_LENGTHS[month - 1] ?? 0
}
