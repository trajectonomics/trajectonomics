import type { LimitEstimate, Measure } from "./limits"

const WEEK_DAYS = 7
const MONTH_DAYS = 30

/** A week's estimate scaled to 30 days for a plan whose vendor states no monthly window. */
export function monthFromWeek(week: LimitEstimate | null): LimitEstimate | null {
	if (week === null) return null
	const scale = (value: number): number => (value * MONTH_DAYS) / WEEK_DAYS
	const cents = (value: number): number => Math.round(scale(value) * 100) / 100
	const tokens = (value: number): number => Math.floor(scale(value))
	const measure = (entry: Measure): Measure => ({
		value: tokens(entry.value),
		low: tokens(entry.low),
		high: entry.high === null ? null : tokens(entry.high),
	})
	const usd: Measure | null =
		week.usd === null
			? null
			: {
					value: cents(week.usd.value),
					low: cents(week.usd.low),
					high: week.usd.high === null ? null : cents(week.usd.high),
				}
	return {
		tokens: tokens(week.tokens),
		low: tokens(week.low),
		high: week.high === null ? null : tokens(week.high),
		processed: measure(week.processed),
		usd,
		points: week.points,
		readings: week.readings,
		rough: week.rough,
		derived: true,
	}
}
