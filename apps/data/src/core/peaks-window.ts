import { DAY_MS, HOUR_MS } from "./rules"

/**
 * The most tokens one plan used in a window, the UTC day the window starts, and the cache reads
 * over the same window. Cache reads are counted apart because they cost far less than other
 * tokens, so they never lift the headline figure.
 */
export type Peak = {
	tokens: number
	fromDay: string
	cacheRead: number
}

/** A candidate window: where it starts and the tokens it holds. */
type Window = { start: number; tokens: number }

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

/** The sum over `[start, start + width)`, with a missing key counting as zero. */
function windowSum(values: ReadonlyMap<number, number>, start: number, width: number): number {
	let sum = 0
	for (let key = start; key < start + width; key += 1) sum += values.get(key) ?? 0
	return sum
}

/** The peak a winning window draws: its tokens, the cache reads beside them, and its start day. */
function peakOf(
	start: number,
	tokens: number,
	cacheReads: ReadonlyMap<number, number>,
	width: number,
	stepMs: number,
): Peak {
	return {
		tokens,
		fromDay: new Date(start * stepMs).toISOString().slice(0, 10),
		cacheRead: windowSum(cacheReads, start, width),
	}
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
	cacheReads: ReadonlyMap<number, number> = new Map(),
): Peak | null {
	const range = bounds(values)
	if (range === null) return null
	let sum = windowSum(values, range.first, width)
	let bestSum = sum
	let bestStart = range.first
	for (let start = range.first + 1; start <= range.last; start += 1) {
		sum += (values.get(start + width - 1) ?? 0) - (values.get(start - 1) ?? 0)
		if (sum > bestSum) {
			bestSum = sum
			bestStart = start
		}
	}
	return peakOf(bestStart, bestSum, cacheReads, width, stepMs)
}

/**
 * The best window when windows are anchored to activity: a window starts at the first key with
 * data the previous window does not cover, covers `[start, start + width)`, and the next starts at
 * the first key with data at or after that window's end. Ties keep the earliest start. Claude's
 * 5-hour session starts with its first message, so its windows are anchored rather than slid.
 */
export function anchoredWindows(
	values: ReadonlyMap<number, number>,
	width: number,
	stepMs: number,
	cacheReads: ReadonlyMap<number, number> = new Map(),
): Peak | null {
	const keys = [...values.keys()].sort((left, right) => left - right)
	let best: Window | null = null
	let index = 0
	while (index < keys.length) {
		const start = keys[index] ?? 0
		const tokens = windowSum(values, start, width)
		while (index < keys.length && (keys[index] ?? 0) < start + width) index += 1
		if (best === null || tokens > best.tokens) best = { start, tokens }
	}
	return best === null ? null : peakOf(best.start, best.tokens, cacheReads, width, stepMs)
}

/** An hour-aligned timestamp as a whole number of hours since the epoch. */
export function hourKey(hourUtc: string): number {
	return Date.parse(hourUtc) / HOUR_MS
}

/** A `YYYY-MM-DD` day as a whole number of days since the epoch. */
export function dayKey(day: string): number {
	return Date.parse(`${day}T00:00:00.000Z`) / DAY_MS
}
