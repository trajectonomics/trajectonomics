import type { MeasuredTier, Peak } from "./types"

/**
 * The plans whose vendor states no monthly window, so a measured 30-day figure is meaningless:
 * Claude states 5-hour and weekly limits only, and Antigravity refreshes its quota weekly and every
 * five hours (the notes in `collector/src/tier-catalog/`).
 */
export const MONTH_FROM_WEEK: ReadonlySet<string> = new Set(["claude", "antigravity"])

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
