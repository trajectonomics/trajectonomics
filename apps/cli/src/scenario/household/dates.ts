/**
 * Age to date (cli ADR-0048). Pure arithmetic over the calendar: no clock, no locale, no `Date`,
 * whose two-digit-year rule would misplace a year below 100.
 */

import { daysInMonth } from "../../calendar"

/** The earliest and latest year an anchored date may fall in. */
const FIRST_YEAR = 1
const LAST_YEAR = 9998

export function yearOf(month: string): number {
	return Number(month.slice(0, 4))
}

function pad(value: number, width: number): string {
	return String(value).padStart(width, "0")
}

/**
 * Age N, as the last day of the birth month in year `born + N`: someone born 1990-06 turns 60 on
 * 2050-06-30, and someone born 1992-02 turns 60 on 2052-02-29. Null when the year leaves
 * 0001-9998.
 */
export function ageDate(born: string, age: number): string | null {
	const year = yearOf(born) + age
	const month = Number(born.slice(5, 7))
	if (year < FIRST_YEAR || year > LAST_YEAR) return null
	return `${pad(year, 4)}-${pad(month, 2)}-${pad(daysInMonth(year, month), 2)}`
}

/** A partner's join month (YYYY-MM) as its first day. */
export function joinsDate(joins: string): string | null {
	const year = yearOf(joins)
	if (year < FIRST_YEAR || year > LAST_YEAR) return null
	return `${joins}-01`
}
