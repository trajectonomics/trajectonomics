import type { Granularity } from "@trajectonomics/data-collector/types"
import { anchoredWindows, bestWindow, dayKey, hourKey, type Peak } from "./peaks-window"
import { DAY_MS, HOUR_MS } from "./rules"

/**
 * The plans whose 5-hour window starts at their first active hour instead of sliding over the
 * clock. Claude's 5-hour session starts with the first message (Claude help centre, read
 * 2026-11-27).
 */
export const FIVE_HOUR_ANCHOR: ReadonlySet<string> = new Set(["claude"])

/** One plan's tokens and cache reads at one UTC hour or day, summed over machines and models. */
export type PeakRow = {
	plan: string
	hourUtc: string
	granularity: Granularity
	/** Tokens without cache reads, which the read keeps in `cacheRead`. */
	tokensTotal: number
	cacheRead: number
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

/** One plan's token and cache-read sums, by UTC hour and by UTC day. */
type PlanSums = {
	hours: Map<number, number>
	days: Map<number, number>
	hourCacheReads: Map<number, number>
	dayCacheReads: Map<number, number>
}

function add(sums: Map<number, number>, key: number, value: number): void {
	sums.set(key, (sums.get(key) ?? 0) + value)
}

function sumRow(sums: PlanSums, row: PeakRow): void {
	const day = dayKey(row.hourUtc.slice(0, 10))
	add(sums.days, day, row.tokensTotal)
	add(sums.dayCacheReads, day, row.cacheRead)
	if (row.granularity !== "hour") return
	const hour = hourKey(row.hourUtc)
	add(sums.hours, hour, row.tokensTotal)
	add(sums.hourCacheReads, hour, row.cacheRead)
}

function sumsOf(plan: string, plans: Map<string, PlanSums>): PlanSums {
	let sums = plans.get(plan)
	if (sums === undefined) {
		sums = {
			hours: new Map(),
			days: new Map(),
			hourCacheReads: new Map(),
			dayCacheReads: new Map(),
		}
		plans.set(plan, sums)
	}
	return sums
}

/**
 * The largest number of tokens each plan used in its 5-hour window, any 7 UTC days and any 30 UTC
 * days. Only hourly rows feed the five-hour window; every row feeds the day windows, because a
 * daily export (Mistral) has no hour to place. No hour leaves this function.
 */
export function peaksByPlan(rows: readonly PeakRow[]): PlanPeaks[] {
	const plans = new Map<string, PlanSums>()
	for (const row of rows) sumRow(sumsOf(row.plan, plans), row)
	return [...plans.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([plan, sums]) => ({
			plan,
			fiveHours: FIVE_HOUR_ANCHOR.has(plan)
				? anchoredWindows(sums.hours, FIVE_HOURS, HOUR_MS, sums.hourCacheReads)
				: bestWindow(sums.hours, FIVE_HOURS, HOUR_MS, sums.hourCacheReads),
			sevenDays: bestWindow(sums.days, SEVEN_DAYS, DAY_MS, sums.dayCacheReads),
			thirtyDays: bestWindow(sums.days, THIRTY_DAYS, DAY_MS, sums.dayCacheReads),
		}))
}
