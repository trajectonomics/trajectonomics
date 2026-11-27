import { tierOn } from "@trajectonomics/data-collector/plans"
import { peaksByPlanAndTier } from "../core/peaks"
import type { PeakDbRow } from "../db/read"

/**
 * The JSON body of a peaks read. A figure carries the UTC day its window started, never an hour,
 * and its cache reads beside its tokens. `tier` is the tier the plan ran on at `asOf`, and the
 * plan's three figures are that tier's; `measured` keeps every tier's own figures, so the site can
 * estimate another tier from one it measured. `methodVersion` is 2: tokens leave cache reads out,
 * Claude's 5-hour windows are anchored to its first message, and `PEAKS_SHAPE` is 3.
 */
export function peaksPayload(asOf: string, rows: readonly PeakDbRow[]) {
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
		return {
			plan: entry.plan,
			tier,
			fiveHours: current?.fiveHours ?? null,
			sevenDays: current?.sevenDays ?? null,
			thirtyDays: current?.thirtyDays ?? null,
			measured: entry.tiers,
		}
	})
	return { asOf, methodVersion: 2, plans }
}
