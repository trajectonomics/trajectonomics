import type { Granularity } from "@trajectonomics/data-collector/types"
import { DAY_MS, HOUR_MS } from "./rules"

/** One plan's tokens at one UTC hour or day, already summed over machines and models. */
export type PeakRow = {
	plan: string
	hourUtc: string
	granularity: Granularity
	tokensTotal: number
}

/** The most tokens one plan used in a window, and the UTC day the window starts. */
export type Peak = {
	tokens: number
	fromDay: string
}

/** One plan's three peaks; a five-hour peak is null when the plan has no hourly rows. */
export type PlanPeaks = {
	plan: string
	fiveHours: Peak | null
	sevenDays: Peak | null
	thirtyDays: Peak | null
}

/** The widths, in clock hours and UTC days, of the three windows. */
export const FIVE_HOURS = 5
export const SEVEN_DAYS = 7
export const THIRTY_DAYS = 30

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
function bestWindow(
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
function hourKey(hourUtc: string): number {
	return Date.parse(hourUtc) / HOUR_MS
}

/** A `YYYY-MM-DD` day as a whole number of days since the epoch. */
function dayKey(day: string): number {
	return Date.parse(`${day}T00:00:00.000Z`) / DAY_MS
}

/**
 * The largest number of tokens each plan used in any 5 clock hours, any 7 UTC days and any 30 UTC
 * days. Only hourly rows feed the five-hour window; every row feeds the day windows, because a
 * daily export (Mistral) has no hour to place. No hour leaves this function.
 */
export function peaksByPlan(rows: readonly PeakRow[]): PlanPeaks[] {
	const plans = new Map<string, { hours: Map<number, number>; days: Map<number, number> }>()
	for (const row of rows) {
		const sums = plans.get(row.plan) ?? { hours: new Map(), days: new Map() }
		const day = dayKey(row.hourUtc.slice(0, 10))
		sums.days.set(day, (sums.days.get(day) ?? 0) + row.tokensTotal)
		if (row.granularity === "hour") {
			const hour = hourKey(row.hourUtc)
			sums.hours.set(hour, (sums.hours.get(hour) ?? 0) + row.tokensTotal)
		}
		plans.set(row.plan, sums)
	}
	return [...plans.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([plan, sums]) => ({
			plan,
			fiveHours: bestWindow(sums.hours, FIVE_HOURS, HOUR_MS),
			sevenDays: bestWindow(sums.days, SEVEN_DAYS, DAY_MS),
			thirtyDays: bestWindow(sums.days, THIRTY_DAYS, DAY_MS),
		}))
}
