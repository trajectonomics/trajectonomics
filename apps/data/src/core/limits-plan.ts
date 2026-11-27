import { estimateLimit, type LimitEstimate } from "./limits"
import { monthFromWeek } from "./limits-month"
import type { QuotaReading } from "./limits-readings"
import type { MeterHour } from "./meter-hours"
import { MONTH_FROM_WEEK } from "./plan-month"
import type { QuotaWindow } from "./types"

/** One plan's quota sample with the window it belongs to. */
export type QuotaReadingWindow = QuotaReading & { window: QuotaWindow }

/** One plan's three limit estimates; a window whose meter never moved has none. */
export type PlanLimits = {
	fiveHours: LimitEstimate | null
	sevenDays: LimitEstimate | null
	thirtyDays: LimitEstimate | null
}

/** One plan's three estimates, from its readings and its hourly measures. */
export function planLimits(
	plan: string,
	readings: readonly QuotaReadingWindow[],
	hours: ReadonlyMap<number, MeterHour>,
): PlanLimits {
	const windows: Record<QuotaWindow, QuotaReading[]> = {
		five_hour: [],
		weekly: [],
		monthly: [],
	}
	for (const reading of readings) windows[reading.window].push(reading)
	const week = estimateLimit(windows.weekly, hours)
	return {
		fiveHours: estimateLimit(windows.five_hour, hours),
		sevenDays: week,
		thirtyDays: MONTH_FROM_WEEK.has(plan)
			? monthFromWeek(week)
			: estimateLimit(windows.monthly, hours),
	}
}
