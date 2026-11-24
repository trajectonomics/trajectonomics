import { formatDate, isValidDate } from "../../snapshot/dates"

/** A date the page read, with the Buddhist-era year it converted when there was one. */
export type DateRead =
	| { readonly ok: true; readonly date: string; readonly converted: boolean }
	| { readonly ok: false; readonly message: string }

const MONTHS = [
	"january",
	"february",
	"march",
	"april",
	"may",
	"june",
	"july",
	"august",
	"september",
	"october",
	"november",
	"december",
] as const

/** The Buddhist era runs 543 years ahead of the Gregorian calendar; these years are read as Buddhist-era. */
export const BUDDHIST_YEARS = { first: 2560, last: 2600 } as const
const BUDDHIST_OFFSET = 543
const YEAR_RANGE = { first: 1900, last: 2200 } as const

const YEAR_FIRST = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/
const DAY_FIRST_NUMERIC = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/
const DAY_MONTH_NAME = /^(\d{1,2})[ ./-]+([A-Za-z]{3,9})\.?,?[ ./-]+(\d{4})$/
const MONTH_NAME_DAY = /^([A-Za-z]{3,9})\.? +(\d{1,2}),? +(\d{4})$/

/** The month number (1 to 12) an English month name or its three-letter form names, or null. */
function monthNamed(word: string): number | null {
	const lower = word.toLowerCase()
	const at = MONTHS.findIndex(
		(month) => month === lower || (lower.length >= 3 && month.startsWith(lower)),
	)
	return at === -1 ? null : at + 1
}

/** A year, converted when it is Buddhist-era; null when it is outside the years the page reads. */
function gregorian(year: number): { year: number; converted: boolean } | null {
	if (year >= BUDDHIST_YEARS.first && year <= BUDDHIST_YEARS.last) {
		return { year: year - BUDDHIST_OFFSET, converted: true }
	}
	return year >= YEAR_RANGE.first && year <= YEAR_RANGE.last ? { year, converted: false } : null
}

/** The date of a year, month and day when it is a day that exists. */
function made(text: string, year: number, month: number, day: number): DateRead {
	const kept = gregorian(year)
	if (kept === null) {
		const years = `${YEAR_RANGE.first} to ${YEAR_RANGE.last}, or Buddhist-era ${BUDDHIST_YEARS.first} to ${BUDDHIST_YEARS.last}`
		return { ok: false, message: `“${text}” has a year the page does not read. It reads ${years}.` }
	}
	const date = formatDate(kept.year, month, day)
	if (!isValidDate(date)) {
		return { ok: false, message: `“${text}” is not a date that exists.` }
	}
	return { ok: true, date, converted: kept.converted }
}

/** A numeric date with the year last: a day over 12 says which part is the day; both 12 or under is a row to fix. */
function dayOrMonthFirst(text: string, a: number, b: number, year: number): DateRead {
	if (a > 12 && b <= 12) return made(text, year, b, a)
	if (b > 12 && a <= 12) return made(text, year, a, b)
	if (a === b && a <= 12) return made(text, year, a, b)
	if (a <= 12 && b <= 12) {
		const names = `${a} ${MONTHS[b - 1]} or ${b} ${MONTHS[a - 1]}`
		return { ok: false, message: `“${text}” could be ${names}. Write it as YYYY-MM-DD.` }
	}
	return { ok: false, message: `“${text}” is not a date that exists.` }
}

/**
 * Reads one cell as a date. It takes `YYYY-MM-DD` (also with `/` or `.`), a day, an English month name and a
 * year, and a numeric day and month with the year last only when a day over 12 says which is which.
 * `DD/MM/YYYY` is never assumed: `03/04/2026` is a row to fix. A Buddhist-era year (2560 to 2600) is
 * converted. This is a calendar reading and no money arithmetic.
 */
export function readDate(cell: string): DateRead {
	const text = cell.trim()
	const first = YEAR_FIRST.exec(text)
	if (first) return made(text, Number(first[1]), Number(first[2]), Number(first[3]))
	const numeric = DAY_FIRST_NUMERIC.exec(text)
	if (numeric)
		return dayOrMonthFirst(text, Number(numeric[1]), Number(numeric[2]), Number(numeric[3]))
	const named = DAY_MONTH_NAME.exec(text)
	const month = named ? monthNamed(named[2] ?? "") : null
	if (named && month !== null) return made(text, Number(named[3]), month, Number(named[1]))
	const american = MONTH_NAME_DAY.exec(text)
	const inFront = american ? monthNamed(american[1] ?? "") : null
	if (american && inFront !== null)
		return made(text, Number(american[3]), inFront, Number(american[2]))
	return { ok: false, message: `“${text}” is not a date the page reads. Write it as YYYY-MM-DD.` }
}
