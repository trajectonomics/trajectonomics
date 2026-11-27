import { modelPriceOn, tokenCost } from "@trajectonomics/data-collector/price-catalog"
import { hourKey } from "./peaks-window"

/**
 * One plan's hourly token kinds per model, summed over machines and contributors. `tokens_total`
 * is the raw stored total, so it includes cache reads; the nullable kinds stay null when no row of
 * the group reported them, which keeps an unpriced hour visible to the estimate.
 */
export type MeterHourRow = {
	plan: string
	hour_utc: string
	model: string
	tokens_in: number | null
	tokens_out: number | null
	cache_read: number | null
	cache_write: number | null
	tokens_total: number
}

/**
 * One plan hour's three measures. `uncached` is what the peaks count, `processed` counts cache
 * reads in full, and `usd` prices every token kind at its model's list price; an hour holding a
 * model with no price cannot be priced, so its `usd` is null.
 */
export type MeterHour = {
	uncached: number
	processed: number
	usd: number | null
}

/**
 * Each plan's hours keyed by epoch hour. Summed per hour: a null `usd` makes the whole hour null,
 * because pricing only part of an hour would price a mix we never ran.
 */
export function meterHoursByPlan(
	rows: readonly MeterHourRow[],
): Map<string, Map<number, MeterHour>> {
	const plans = new Map<string, Map<number, MeterHour>>()
	for (const row of rows) {
		let hours = plans.get(row.plan)
		if (hours === undefined) {
			hours = new Map()
			plans.set(row.plan, hours)
		}
		const key = hourKey(row.hour_utc)
		const hour = hours.get(key) ?? { uncached: 0, processed: 0, usd: 0 }
		const total = row.tokens_total
		const price = modelPriceOn(row.model)
		const cost =
			price === null
				? null
				: tokenCost(
						{
							tokensIn: row.tokens_in,
							tokensOut: row.tokens_out,
							cacheRead: row.cache_read,
							cacheWrite: row.cache_write,
						},
						price,
					)
		hours.set(key, {
			uncached: hour.uncached + Math.max(0, total - (row.cache_read ?? 0)),
			processed: hour.processed + total,
			usd: hour.usd === null || cost === null ? null : hour.usd + cost,
		})
	}
	return plans
}
