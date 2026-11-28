import { tierOn } from "@trajectonomics/data-collector/plans"
import { planLimits, type QuotaReadingWindow } from "../core/limits-plan"
import { type MeterHourRow, meterHoursByPlan } from "../core/meter-hours"
import { peaksByPlanAndTier } from "../core/peaks"
import type { PeakDbRow, QuotaDbRow } from "../db/read"

/**
 * The name of the tier a plan ran on a UTC day, or null when the plan's catalogue has none. Both
 * sides of a tier comparison go through here, so an unknown tier compares equal to itself.
 */
function tierNameOn(plan: string, day: string): string | null {
	return tierOn(plan, day)?.name ?? null
}

/** Each plan's quota readings, with their windows, in the order the read returned them. */
function readingsByPlan(rows: readonly QuotaDbRow[]): Map<string, QuotaReadingWindow[]> {
	const plans = new Map<string, QuotaReadingWindow[]>()
	for (const row of rows) {
		const readings = plans.get(row.plan) ?? []
		readings.push({
			window: row.window,
			sampledAt: row.sampled_at,
			usedPct: row.used_pct,
			resetsAt: row.resets_at,
		})
		plans.set(row.plan, readings)
	}
	return plans
}

/**
 * The JSON body of a peaks read. A figure carries the UTC day its window started, never an hour,
 * and its cache reads beside its tokens. `tier` is the tier the plan ran on at `asOf`, and the
 * plan's three figures are that tier's; `measured` keeps every tier's own figures, so the site can
 * estimate another tier from one it measured. `limits` estimates each window's 100% from the
 * plan's own meter in three measures (uncached tokens, processed tokens and API list dollars), as
 * aggregates only: no reading, hour, reset time or raw percentage.
 * `methodVersion` is 4: the token measure leaves cache reads out, the estimate also counts them in
 * full and prices every kind at list prices, a rough estimate needs three points over at least a
 * day, Claude's 5-hour windows are anchored to its first message, and `PEAKS_SHAPE` is 5.
 */
export function peaksPayload(
	asOf: string,
	rows: readonly PeakDbRow[],
	quota: readonly QuotaDbRow[] = [],
	meter: readonly MeterHourRow[] = [],
) {
	const hours = meterHoursByPlan(meter)
	const readings = readingsByPlan(quota)
	const plans = peaksByPlanAndTier(
		rows.map((row) => ({
			plan: row.plan,
			hourUtc: row.hour_utc,
			granularity: row.granularity,
			tokensTotal: row.tokens_total,
			cacheRead: row.cache_read,
		})),
		(plan, day) => tierNameOn(plan, day),
	).map((entry) => {
		const tier = tierNameOn(entry.plan, asOf)
		const current = entry.tiers.find((peaks) => peaks.tier === tier)
		const limits = planLimits(
			entry.plan,
			// Only readings taken on the current tier: another tier's meter measures another limit.
			(readings.get(entry.plan) ?? []).filter(
				(reading) => tierNameOn(entry.plan, reading.sampledAt.slice(0, 10)) === tier,
			),
			hours.get(entry.plan) ?? new Map(),
		)
		return {
			plan: entry.plan,
			tier,
			fiveHours: current?.fiveHours ?? null,
			sevenDays: current?.sevenDays ?? null,
			thirtyDays: current?.thirtyDays ?? null,
			limits,
			measured: entry.tiers.map((peaks) => ({
				...peaks,
				limits: peaks.tier === tier ? limits : null,
			})),
		}
	})
	return { asOf, methodVersion: 4, plans }
}
