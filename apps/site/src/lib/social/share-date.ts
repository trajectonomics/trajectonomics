/** The milliseconds in one UTC day. */
const DAY_MS = 86_400_000

/** An ISO date, as `traj` states one: four-digit year, month and day. */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** The ways a share date is rejected: not an ISO date, no month name, or a span with no days. */
export type ShareDateErrorCode =
	| "SHARE_DATE_INVALID"
	| "SHARE_DATE_MONTH_MISSING"
	| "SHARE_DATE_SPAN_EMPTY"

/** A rejected date or span: the code names the rule, `field` the input that broke it. */
export interface ShareDateError extends Error {
	readonly code: ShareDateErrorCode
	readonly field: string
}

/** The rejection of one date or span, frozen so a caller cannot edit the verdict. */
function shareDateError(code: ShareDateErrorCode, field: string, message: string): ShareDateError {
	return Object.freeze(Object.assign(new Error(message), { code, field }))
}

/** The parts of an ISO date, or a rejection naming the field that is not one. */
function isoDateParts(isoDate: string, field: string): readonly [string, string, string] {
	const match = ISO_DATE.exec(isoDate)
	if (match === null) {
		throw shareDateError(
			"SHARE_DATE_INVALID",
			field,
			`"${isoDate}" is not an ISO date of the form yyyy-mm-dd.`,
		)
	}
	return [match[1] ?? "", match[2] ?? "", match[3] ?? ""]
}

/** The number of the UTC day one named input names, counted from 1970-01-01. */
function dayNumberOf(isoDate: string, field: string): number {
	const [year, month, day] = isoDateParts(isoDate, field)
	return Date.UTC(Number(year), Number(month) - 1, Number(day)) / DAY_MS
}

/** The number of the UTC day an ISO date names, counted from 1970-01-01. */
export function dayNumber(isoDate: string): number {
	return dayNumberOf(isoDate, "isoDate")
}

/** The share of the way `isoDate` sits from `from` to `to`, as the time axis reads it. */
export function dateFraction(isoDate: string, from: string, to: string): number {
	const start = dayNumberOf(from, "from")
	const span = dayNumberOf(to, "to") - start
	if (span <= 0) {
		throw shareDateError(
			"SHARE_DATE_SPAN_EMPTY",
			"to",
			`the span from "${from}" to "${to}" does not move forward, so a date has no share of it.`,
		)
	}
	return (dayNumberOf(isoDate, "isoDate") - start) / span
}

/**
 * `isoDate` as a short month and its Gregorian year: "Aug 2041". It reads the Language's own month
 * names rather than `Intl`, whose Thai calendar writes a Buddhist year of 2584.
 */
export function shortMonthYear(isoDate: string, months: readonly string[]): string {
	const [year, month] = isoDateParts(isoDate, "isoDate")
	const name = months[Number(month) - 1]
	if (name === undefined) {
		throw shareDateError(
			"SHARE_DATE_MONTH_MISSING",
			"months",
			`the month of "${isoDate}" has no name among the ${months.length} the Dictionary writes.`,
		)
	}
	return `${name} ${year}`
}
