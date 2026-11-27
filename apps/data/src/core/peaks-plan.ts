import type { Granularity } from "@trajectonomics/data-collector/types"
import { bestWindow, dayKey, hourKey, type Peak } from "./peaks-window"
import { DAY_MS, HOUR_MS } from "./rules"

/** One plan's tokens at one UTC hour or day, already summed over machines and models. */
export type PeakRow = {
	plan: string
	hourUtc: string
	granularity: Granularity
	tokensTotal: number
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
