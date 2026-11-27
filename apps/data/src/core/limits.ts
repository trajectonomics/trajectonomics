import { type QuotaReading, segmentsOf, tokensBetween } from "./limits-readings"
import { MONTH_FROM_WEEK } from "./plan-month"
import type { QuotaWindow } from "./types"

export type { QuotaReading } from "./limits-readings"

/**
 * One window's limit estimate: the tokens the plan would hold at 100%, the range its rounded
 * meter readings allow, and how much evidence stands behind it. `rough` marks fewer than three
 * percentage points of meter movement; `derived` marks a 30-day figure scaled from the week.
 */
export type LimitEstimate = {
	tokens: number
	low: number
	high: number | null
	points: number
	readings: number
	rough: boolean
	derived?: boolean
}

/** One plan's quota sample with the window it belongs to. */
export type QuotaReadingWindow = QuotaReading & { window: QuotaWindow }

/** One plan's three limit estimates; a window whose meter never moved has none. */
export type PlanLimits = {
	fiveHours: LimitEstimate | null
	sevenDays: LimitEstimate | null
	thirtyDays: LimitEstimate | null
}

const WEEK_DAYS = 7
const MONTH_DAYS = 30

/**
 * Estimates one plan window's 100% from its meter readings and its hourly uncached tokens:
 * tokens used ÷ percentage points the meter moved × 100, pooled over every segment whose meter
 * rose. Each reading is rounded to a whole percent, so a segment's movement is uncertain by one
 * point: `low` counts one extra point per segment and `high` one fewer, and `high` is null until
 * the movement exceeds the segments' rounding.
 */
export function estimateLimit(
	readings: readonly QuotaReading[],
	hourlyTokens: ReadonlyMap<number, number>,
): LimitEstimate | null {
	let tokens = 0
	let points = 0
	let segments = 0
	let count = 0
	for (const segment of segmentsOf(readings)) {
		const moved = segment.last.usedPct - segment.first.usedPct
		if (moved <= 0) continue
		tokens += tokensBetween(hourlyTokens, segment.first.sampledAt, segment.last.sampledAt)
		points += moved
		segments += 1
		count += segment.readings
	}
	if (points <= 0) return null
	return {
		tokens: Math.round((tokens / points) * 100),
		low: Math.round((tokens / (points + segments)) * 100),
		high: points - segments > 0 ? Math.round((tokens / (points - segments)) * 100) : null,
		points,
		readings: count,
		rough: points < 3,
	}
}

/** A week's estimate scaled to 30 days for a plan whose vendor states no monthly window. */
function monthFromWeek(week: LimitEstimate | null): LimitEstimate | null {
	if (week === null) return null
	return {
		tokens: Math.floor((week.tokens * MONTH_DAYS) / WEEK_DAYS),
		low: Math.floor((week.low * MONTH_DAYS) / WEEK_DAYS),
		high: week.high === null ? null : Math.floor((week.high * MONTH_DAYS) / WEEK_DAYS),
		points: week.points,
		readings: week.readings,
		rough: week.rough,
		derived: true,
	}
}

/** One plan's three estimates, from its readings and its hourly uncached tokens. */
export function planLimits(
	plan: string,
	readings: readonly QuotaReadingWindow[],
	hourlyTokens: ReadonlyMap<number, number>,
): PlanLimits {
	const windows: Record<QuotaWindow, QuotaReading[]> = {
		five_hour: [],
		weekly: [],
		monthly: [],
	}
	for (const reading of readings) windows[reading.window].push(reading)
	const week = estimateLimit(windows.weekly, hourlyTokens)
	return {
		fiveHours: estimateLimit(windows.five_hour, hourlyTokens),
		sevenDays: week,
		thirtyDays: MONTH_FROM_WEEK.has(plan)
			? monthFromWeek(week)
			: estimateLimit(windows.monthly, hourlyTokens),
	}
}
