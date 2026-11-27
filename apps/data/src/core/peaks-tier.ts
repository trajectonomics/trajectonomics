import { type PeakRow, peaksByPlan } from "./peaks-plan"
import type { Peak } from "./peaks-window"

/** One tier's peaks within a plan. */
export type TierPeaks = {
	tier: string | null
	fiveHours: Peak | null
	sevenDays: Peak | null
	thirtyDays: Peak | null
}

/** One plan's peaks, split by the tier each row ran on. */
export type PlanTierPeaks = {
	plan: string
	tiers: TierPeaks[]
}

/** One plan and tier's rows, kept apart so no window mixes two tiers. */
type TierGroup = {
	plan: string
	tier: string | null
	rows: PeakRow[]
}

/** Splits rows by plan and the tier their UTC day ran on. */
function groupByTier(
	rows: readonly PeakRow[],
	tierOf: (plan: string, day: string) => string | null,
): TierGroup[] {
	const groups = new Map<string, TierGroup>()
	for (const row of rows) {
		const tier = tierOf(row.plan, row.hourUtc.slice(0, 10))
		const key = `${row.plan}\u0000${tier ?? ""}`
		const group = groups.get(key)
		if (group === undefined) groups.set(key, { plan: row.plan, tier, rows: [row] })
		else group.rows.push(row)
	}
	return [...groups.values()]
}

/** One group's three peaks, or null when it has no rows to measure. */
function tierPeaks(group: TierGroup): TierPeaks | null {
	const peaks = peaksByPlan(group.rows)[0]
	if (peaks === undefined) return null
	return {
		tier: group.tier,
		fiveHours: peaks.fiveHours,
		sevenDays: peaks.sevenDays,
		thirtyDays: peaks.thirtyDays,
	}
}

/**
 * The same peaks, split by the tier each row ran on. A plan's tiers are computed from their own
 * rows, so a window that straddles a tier change never adds one tier's usage to another's.
 */
export function peaksByPlanAndTier(
	rows: readonly PeakRow[],
	tierOf: (plan: string, day: string) => string | null,
): PlanTierPeaks[] {
	const byPlan = new Map<string, TierPeaks[]>()
	for (const group of groupByTier(rows, tierOf)) {
		const peaks = tierPeaks(group)
		if (peaks === null) continue
		const tiers = byPlan.get(group.plan) ?? []
		tiers.push(peaks)
		byPlan.set(group.plan, tiers)
	}
	return [...byPlan.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([plan, tiers]) => ({
			plan,
			tiers: tiers.sort((left, right) => (left.tier ?? "").localeCompare(right.tier ?? "")),
		}))
}
