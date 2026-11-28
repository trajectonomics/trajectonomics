import { type Measure, measureOf, sumsBetween } from "./limits-measures"
import { type QuotaReading, segmentsOf } from "./limits-readings"
import type { MeterHour } from "./meter-hours"
import { DAY_MS } from "./rules"

export type { Measure } from "./limits-measures"
export type { QuotaReading } from "./limits-readings"

/**
 * One window's limit estimate in three measures: the uncached tokens at 100% (the peaks'
 * measure), the processed tokens that count cache reads in full, and their API list dollars.
 * `rough` marks thin evidence and `derived` a month scaled from the week.
 */
export type LimitEstimate = {
	tokens: number
	low: number
	high: number | null
	processed: Measure
	usd: Measure | null
	points: number
	readings: number
	rough: boolean
	derived?: boolean
}

/** Every contributing segment's measures and evidence, pooled. */
type Pooled = {
	tokens: number
	processed: number
	usd: number | null
	points: number
	segments: number
	readings: number
	firstMs: number
	lastMs: number
}

/** Pools the segments whose meter rose and whose uncached tokens did not; null when none did. */
function poolSegments(
	readings: readonly QuotaReading[],
	hours: ReadonlyMap<number, MeterHour>,
): Pooled | null {
	const pooled: Pooled = {
		tokens: 0,
		processed: 0,
		usd: 0,
		points: 0,
		segments: 0,
		readings: 0,
		firstMs: Number.POSITIVE_INFINITY,
		lastMs: Number.NEGATIVE_INFINITY,
	}
	for (const segment of segmentsOf(readings)) {
		const moved = segment.last.usedPct - segment.first.usedPct
		if (moved <= 0) continue
		// A segment with no hourly tokens behind it (day rows only, or use we never collected)
		// says nothing about the limit, so it adds no points either.
		const sums = sumsBetween(hours, segment.first.sampledAt, segment.last.sampledAt)
		if (sums.uncached <= 0) continue
		pooled.tokens += sums.uncached
		pooled.processed += sums.processed
		pooled.usd = pooled.usd === null || sums.usd === null ? null : pooled.usd + sums.usd
		pooled.points += moved
		pooled.segments += 1
		pooled.readings += segment.readings
		pooled.firstMs = Math.min(pooled.firstMs, Date.parse(segment.first.sampledAt))
		pooled.lastMs = Math.max(pooled.lastMs, Date.parse(segment.last.sampledAt))
	}
	return pooled.points > 0 ? pooled : null
}

/**
 * Estimates one plan window's 100% as tokens used ÷ points the meter moved × 100, pooled over
 * every segment whose meter rose and whose uncached tokens did not, in all three measures. Whole
 * percent rounding widens the range by one point per segment, and an estimate is rough until it
 * has three points over at least a day. Dollars are null when an hour of a contributing segment
 * holds a model with no list price, because an hour is priced whole or not at all.
 */
export function estimateLimit(
	readings: readonly QuotaReading[],
	hours: ReadonlyMap<number, MeterHour>,
): LimitEstimate | null {
	const pooled = poolSegments(readings, hours)
	if (pooled === null) return null
	const uncached = measureOf(pooled.tokens, pooled.points, pooled.segments)
	const usd =
		pooled.usd === null ? null : measureOf(pooled.usd, pooled.points, pooled.segments, true)
	return {
		tokens: uncached.value,
		low: uncached.low,
		high: uncached.high,
		processed: measureOf(pooled.processed, pooled.points, pooled.segments),
		usd,
		points: pooled.points,
		readings: pooled.readings,
		rough: pooled.points < 3 || pooled.lastMs - pooled.firstMs < DAY_MS,
	}
}
