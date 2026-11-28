import type { QueryError } from "./errors"
import { type Check, checkDate } from "./query"
import { DAY_MS, MAX_HOURLY_SPAN_DAYS, nextDay } from "./rules"

/** A validated hourly query: the inclusive days it reads and the as-of day it reports. */
export type HourlyQuery = {
	from: string
	to: string
	asOf: string
}

/** The result of reading the hourly query parameters. */
export type HourlyResult = { ok: true; query: HourlyQuery } | { ok: false; error: QueryError }

/** Why a lower and upper day cannot be read, or null when they can. */
function rangeError(lower: string, upper: string): QueryError | null {
	if (lower > upper) return { code: "INVALID_RANGE", message: "from must not be after to." }
	const span =
		(Date.parse(`${upper}T00:00:00.000Z`) - Date.parse(`${lower}T00:00:00.000Z`)) / DAY_MS
	if (span > MAX_HOURLY_SPAN_DAYS - 1) {
		return {
			code: "INVALID_RANGE",
			message: `The hourly range must span at most ${MAX_HOURLY_SPAN_DAYS} days.`,
		}
	}
	return null
}

/**
 * Validates the hourly read's parameters. It reads `from`, `to` and `asOf` with the usage read's
 * day checks, caps `to` at `asOf` the same way, and refuses a window longer than a week because
 * the response answers every hour in it.
 */
export function parseHourlyQuery(url: URL, nowMs: number): HourlyResult {
	const params = url.searchParams
	const today = new Date(nowMs).toISOString().slice(0, 10)
	const maxDay = nextDay(today)
	const from: Check = checkDate(params, "from", maxDay)
	if (!from.ok) return from
	const to: Check = checkDate(params, "to", maxDay)
	if (!to.ok) return to
	const asOf: Check = checkDate(params, "asOf", maxDay)
	if (!asOf.ok) return asOf
	const upper =
		asOf.value !== null && asOf.value < (to.value ?? today) ? asOf.value : (to.value ?? today)
	const lower = from.value ?? upper
	const range = rangeError(lower, upper)
	if (range !== null) return { ok: false, error: range }
	return { ok: true, query: { from: lower, to: upper, asOf: asOf.value ?? today } }
}
