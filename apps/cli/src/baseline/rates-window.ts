import { daysInMonth } from "../calendar"

/** One inclusive window of whole calendar months: its first day and its last day. */
export type MonthWindow = { from: string; to: string }

/** The window the rates are stated over, the part of it the record covers, and those months. */
export type RateWindow = {
	/** The months asked for: `months` whole months ending at the last full month on or before the As-of. */
	window: MonthWindow
	/** The part of the window the record covers, or null when it covers no whole month. */
	covered: MonthWindow | null
	/** The covered months, oldest first, as `YYYY-MM`. */
	monthKeys: string[]
}

/** `YYYY-MM-DD` → `YYYY-MM`. */
export function monthKeyOf(date: string): string {
	return date.slice(0, 7)
}

function padded(value: number): string {
	return String(value).padStart(2, "0")
}

/** `YYYY-MM` moved by whole months, in either direction. */
export function addMonths(key: string, by: number): string {
	const year = Number(key.slice(0, 4))
	const month = Number(key.slice(5, 7))
	const zero = year * 12 + (month - 1) + by
	return `${String(Math.floor(zero / 12)).padStart(4, "0")}-${padded((zero % 12) + 1)}`
}

/** The first day of a month, as `YYYY-MM-DD`. */
export function monthStartOf(key: string): string {
	return `${key}-01`
}

/** The last day of a month, as `YYYY-MM-DD`. */
export function monthEndOf(key: string): string {
	return `${key}-${padded(daysInMonth(Number(key.slice(0, 4)), Number(key.slice(5, 7))))}`
}

/** Whether the date is the last day of its own month. */
export function isMonthEnd(date: string): boolean {
	return date === monthEndOf(monthKeyOf(date))
}

/** Every whole calendar month from `first` to `last` inclusive, oldest first. */
function monthKeysBetween(first: string, last: string): string[] {
	const keys: string[] = []
	for (let key = first; key <= last; key = addMonths(key, 1)) keys.push(key)
	return keys
}

/**
 * The first month the record covers in full: the month of the first Transaction when it is dated
 * the 1st, otherwise the month after it, because a part-month would make the rate too low.
 */
function recordStartMonthOf(date: string): string {
	const key = monthKeyOf(date)
	return date.slice(8, 10) === "01" ? key : addMonths(key, 1)
}

/**
 * The window of whole calendar months ending at the last full month on or before the As-of, and
 * the months the record covers: those on or after its first full month. The As-of month counts
 * only when the As-of is its last day, so a part-month is never divided into the rate.
 */
export function rateWindowOf(
	asOf: string,
	months: number,
	firstTransactionDate: string | null,
): RateWindow {
	const last = isMonthEnd(asOf) ? monthKeyOf(asOf) : addMonths(monthKeyOf(asOf), -1)
	const first = addMonths(last, -(months - 1))
	const window = { from: monthStartOf(first), to: monthEndOf(last) }
	const recordStart =
		firstTransactionDate === null ? null : recordStartMonthOf(firstTransactionDate)
	const monthKeys =
		recordStart === null ? [] : monthKeysBetween(first, last).filter((key) => key >= recordStart)
	const head = monthKeys[0]
	const tail = monthKeys.at(-1)
	const covered =
		head === undefined || tail === undefined
			? null
			: { from: monthStartOf(head), to: monthEndOf(tail) }
	return { window, covered, monthKeys }
}
