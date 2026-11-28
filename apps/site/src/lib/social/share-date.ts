/** The milliseconds in one UTC day. */
const DAY_MS = 86_400_000

/** An ISO date, as `traj` states one: four-digit year, month and day. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** The number of the UTC day an ISO date names, counted from 1970-01-01. */
export function dayNumber(isoDate: string): number {
	const match = ISO_DATE.exec(isoDate)
	if (match === null) throw new RangeError(`dayNumber: "${isoDate}" is not an ISO date.`)
	return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS
}

/** The share of the way `isoDate` sits from `from` to `to`, as the time axis reads it. */
export function dateFraction(isoDate: string, from: string, to: string): number {
	return (dayNumber(isoDate) - dayNumber(from)) / (dayNumber(to) - dayNumber(from))
}

/**
 * `isoDate` as a short month and its Gregorian year: "Aug 2041". It reads the Language's own month
 * names rather than `Intl`, whose Thai calendar writes a Buddhist year of 2584.
 */
export function shortMonthYear(isoDate: string, months: readonly string[]): string {
	const match = ISO_DATE.exec(isoDate)
	const month = match === null ? undefined : months[Number(match[2]) - 1]
	if (match === null || month === undefined) {
		throw new RangeError(`shortMonthYear: "${isoDate}" is not a date twelve month names write.`)
	}
	return `${month} ${match[1]}`
}
