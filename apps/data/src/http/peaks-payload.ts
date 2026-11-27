import { tierOn } from "@trajectonomics/data-collector/plans"
import { planLimits, type QuotaReadingWindow } from "../core/limits"
import { peaksByPlanAndTier } from "../core/peaks"
import { hourKey } from "../core/peaks-window"
import type { PeakDbRow, QuotaDbRow } from "../db/read"

/** Each plan's hourly uncached tokens, keyed by epoch hour; daily rows never feed a meter. */
function hourlyByPlan(rows: readonly PeakDbRow[]): Map<string, Map<number, number>> {
	const plans = new Map<string, Map<number, number>>()
	for (const row of rows) {
		if (row.granularity !== "hour") continue
		let hours = plans.get(row.plan)
		if (hours === undefined) {
			hours = new Map()
			plans.set(row.plan, hours)
		}
		const key = hourKey(row.hour_utc)
		hours.set(key, (hours.get(key) ?? 0) + row.tokens_total)
	}
	return plans
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
 * plan's own meter, as aggregates only: no reading, hour, reset time or raw percentage.
 * `methodVersion` is 3: the token measure leaves cache reads out, Claude's 5-hour windows are
 * anchored to its first message, and `PEAKS_SHAPE` is 4.
 */
export function peaksPayload(
	asOf: string,
	rows: readonly PeakDbRow[],
	quota: readonly QuotaDbRow[] = [],
) {
	const hourly = hourlyByPlan(rows)
	const readings = readingsByPlan(quota)
	const plans = peaksByPlanAndTier(
		rows.map((row) => ({
			plan: row.plan,
			hourUtc: row.hour_utc,
			granularity: row.granularity,
			tokensTotal: row.tokens_total,
			cacheRead: row.cache_read,
		})),
		(plan, day) => tierOn(plan, day)?.name ?? null,
	).map((entry) => {
		const tier = tierOn(entry.plan, asOf)?.name ?? null
		const current = entry.tiers.find((peaks) => peaks.tier === tier)
		const limits = planLimits(
			entry.plan,
			// Only readings taken on the current tier: another tier's meter measures another limit.
			(readings.get(entry.plan) ?? []).filter(
				(reading) => tierOn(entry.plan, reading.sampledAt.slice(0, 10))?.name === tier,
			),
			hourly.get(entry.plan) ?? new Map(),
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
	return { asOf, methodVersion: 3, plans }
}
