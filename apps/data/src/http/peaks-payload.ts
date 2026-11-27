import { tierOn } from "@trajectonomics/data-collector/plans"
import { peaksByPlan } from "../core/peaks"
import type { PeakDbRow } from "../db/read"

/**
 * The JSON body of a peaks read. A figure carries the UTC day its window started, never an hour,
 * and `tier` is the tier the plan ran on at `asOf`.
 */
export function peaksPayload(asOf: string, rows: readonly PeakDbRow[]) {
	const plans = peaksByPlan(
		rows.map((row) => ({
			plan: row.plan,
			hourUtc: row.hour_utc,
			granularity: row.granularity,
			tokensTotal: row.tokens_total,
		})),
	).map((plan) => ({
		plan: plan.plan,
		tier: tierOn(plan.plan, asOf)?.name ?? null,
		fiveHours: plan.fiveHours,
		sevenDays: plan.sevenDays,
		thirtyDays: plan.thirtyDays,
	}))
	return { asOf, methodVersion: 1, plans }
}
