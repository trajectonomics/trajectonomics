import { tierOn } from "@trajectonomics/data-collector/plans"
import { peaksByPlanAndTier } from "../core/peaks"
import type { PeakDbRow } from "../db/read"

/**
 * The JSON body of a peaks read. A figure carries the UTC day its window started, never an hour.
 * `tier` is the tier the plan ran on at `asOf`, and the plan's three figures are that tier's;
 * `measured` keeps every tier's own figures, so the site can estimate another tier from one it
 * measured.
 */
export function peaksPayload(asOf: string, rows: readonly PeakDbRow[]) {
	const plans = peaksByPlanAndTier(
		rows.map((row) => ({
			plan: row.plan,
			hourUtc: row.hour_utc,
			granularity: row.granularity,
			tokensTotal: row.tokens_total,
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
	return { asOf, methodVersion: 1, plans }
}
