import { DAY_MS, HOUR_MS } from "./rules"

/** The most tokens one plan used in a window, and the UTC day the window starts. */
export type Peak = {
	tokens: number
	fromDay: string
}

/** The first and last keys of a series; null when it is empty. */
function bounds(values: ReadonlyMap<number, number>): { first: number; last: number } | null {
	if (values.size === 0) return null
	let first = Number.POSITIVE_INFINITY
	let last = Number.NEGATIVE_INFINITY
	for (const key of values.keys()) {
		if (key < first) first = key
		if (key > last) last = key
	}
	return { first, last }
}

/**
 * The best sum over `width` consecutive buckets of an integer-keyed series. Missing keys count as
 * zero, so a window is calendar-consecutive, not consecutive in the rows. Candidate windows start
 * at a bucket with data: a window that starts earlier adds only zeros ahead of one that starts at
 * it, so it can never be larger. Ties keep the earliest start.
 */
export function bestWindow(
	values: ReadonlyMap<number, number>,
	width: number,
	stepMs: number,
): Peak | null {
	const range = bounds(values)
	if (range === null) return null
	let sum = 0
	for (let key = range.first; key < range.first + width; key += 1) sum += values.get(key) ?? 0
	let bestSum = sum
	let bestStart = range.first
	for (let start = range.first + 1; start <= range.last; start += 1) {
		sum += (values.get(start + width - 1) ?? 0) - (values.get(start - 1) ?? 0)
		if (sum > bestSum) {
			bestSum = sum
			bestStart = start
		}
	}
	return { tokens: bestSum, fromDay: new Date(bestStart * stepMs).toISOString().slice(0, 10) }
}

/** An hour-aligned timestamp as a whole number of hours since the epoch. */
export function hourKey(hourUtc: string): number {
	return Date.parse(hourUtc) / HOUR_MS
}

/** A `YYYY-MM-DD` day as a whole number of days since the epoch. */
export function dayKey(day: string): number {
	return Date.parse(`${day}T00:00:00.000Z`) / DAY_MS
}
