import type { PeakColumnKey } from "./peak-words"
import { monthTier } from "./plan-month"
import { type PlanTierLabel, planTier } from "./plan-tier"
import { comparePlans, planName } from "./plans"
import type { Limits, MeasuredTier, Peak, PlanPeak } from "./types"

/** One plan's row: its identity, its tier at the window's end, and the three figures. */
export type PeakTableRow = {
	plan: string
	planName: string
	tier: PlanTierLabel | null
	fiveHours: Peak | null
	sevenDays: Peak | null
	thirtyDays: Peak | null
	/** The current tier's meter estimates; absent on a body cached before shape 4. */
	limits: Limits | null
	measured: MeasuredTier[]
}

/**
 * The peaks in the summary's ranked order. A plan with peaks but no use in the window follows the
 * ranked ones, in the plan table's order, so a plan we stopped using is never hidden.
 */
export function peakTableRows(
	ranked: readonly { plan: string }[],
	plans: readonly PlanPeak[],
	day: string,
): PeakTableRow[] {
	const byPlan = new Map(plans.map((entry) => [entry.plan, entry]))
	const rows: PeakTableRow[] = []
	const rankedPlans = new Set<string>()
	for (const entry of ranked) {
		if (rankedPlans.has(entry.plan)) continue
		const peak = byPlan.get(entry.plan)
		if (peak === undefined) continue
		rankedPlans.add(entry.plan)
		rows.push(tableRow(peak, day))
	}
	const rest = plans
		.filter((entry) => !rankedPlans.has(entry.plan))
		.sort((left, right) => comparePlans(left, right))
	for (const entry of rest) rows.push(tableRow(entry, day))
	return rows
}

/** A row's figure for one column; null when the plan has no peak in that window. */
export function peakOf(row: PeakTableRow, key: PeakColumnKey): Peak | null {
	return row[key]
}

/** The largest figure in one column, which every bar in it is drawn against. */
export function peakColumnMax(rows: readonly PeakTableRow[], key: PeakColumnKey): number {
	let max = 0
	for (const row of rows) {
		const tokens = peakOf(row, key)?.tokens ?? 0
		if (tokens > max) max = tokens
	}
	return max
}

/** A bar's width as a whole percentage of the column's largest figure; zero shares draw 0%. */
export function figureShare(tokens: number, max: number): number {
	if (max <= 0) return 0
	return Math.round((tokens / max) * 100)
}

/** A peak's bar width; a null peak draws nothing. */
export function peakShare(peak: Peak | null, max: number): number {
	return peak === null ? 0 : figureShare(peak.tokens, max)
}

/** The plan's own row, with its month derived where the vendor states no monthly window. */
function ownRow(entry: PlanPeak): MeasuredTier {
	return monthTier(entry.plan, {
		tier: entry.tier,
		fiveHours: entry.fiveHours,
		sevenDays: entry.sevenDays,
		thirtyDays: entry.thirtyDays,
	})
}

function tableRow(entry: PlanPeak, day: string): PeakTableRow {
	const own = ownRow(entry)
	return {
		plan: entry.plan,
		planName: planName(entry.plan),
		tier: planTier(entry.plan, day),
		fiveHours: own.fiveHours,
		sevenDays: own.sevenDays,
		thirtyDays: own.thirtyDays,
		limits: entry.limits ?? null,
		measured: measuredOf(entry).map((tier) => monthTier(entry.plan, tier)),
	}
}

/**
 * The limit estimates of the picked tier: its measured entry's own, or the current tier's when a
 * body cached before shape 4 has no per-tier limits. Another tier has none.
 */
export function limitsOf(row: PeakTableRow, picked: string | null): Limits | null {
	const measured = row.measured.find((entry) => entry.tier === picked)
	if (measured !== undefined && measured.limits !== undefined) return measured.limits
	return picked === row.tier?.name ? row.limits : null
}

/**
 * The tiers a plan was measured on. A body cached before `measured` existed has none, so the
 * plan's own figures stand in as its current tier, and the page still renders. A body cached
 * before shape 3 has no cache reads, which render as no cache line.
 */
export function measuredOf(entry: PlanPeak): MeasuredTier[] {
	if (Array.isArray(entry.measured)) return entry.measured
	return [
		{
			tier: entry.tier,
			fiveHours: entry.fiveHours,
			sevenDays: entry.sevenDays,
			thirtyDays: entry.thirtyDays,
		},
	]
}
