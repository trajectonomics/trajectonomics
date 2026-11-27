import { MONTH_FROM_WEEK } from "../core/plan-month"
import type { MeasuredTier, Peak } from "./types"

export { MONTH_FROM_WEEK }

const WEEK_DAYS = 7
const MONTH_DAYS = 30

/** A token figure scaled from a week to 30 days, cut toward zero. */
function scaleMonth(value: number): number {
	return Math.floor((value * MONTH_DAYS) / WEEK_DAYS)
}

/**
 * The 30-day figure shown for a plan: its measured month, or for a vendor that states no monthly
 * window the week × 30/7, marked derived. A plan with no week has no 30-day figure at all.
 */
export function monthPeak(plan: string, week: Peak | null, month: Peak | null): Peak | null {
	if (!MONTH_FROM_WEEK.has(plan)) return month
	if (week === null) return null
	const cacheRead =
		typeof week.cacheRead === "number" ? scaleMonth(week.cacheRead) : (week.cacheRead ?? null)
	return {
		tokens: scaleMonth(week.tokens),
		fromDay: week.fromDay,
		cacheRead,
		derived: true,
	}
}

/** One measured tier with its 30-day figure derived from its week when the vendor states no month. */
export function monthTier(plan: string, entry: MeasuredTier): MeasuredTier {
	return { ...entry, thirtyDays: monthPeak(plan, entry.sevenDays, entry.thirtyDays) }
}
