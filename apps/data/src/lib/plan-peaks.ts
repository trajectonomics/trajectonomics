import { displayCount } from "./format"
import { type PlanTierLabel, planTier } from "./plan-tier"
import { comparePlans, planName } from "./plans"
import type { MeasuredTier, Peak, PeakWindowKey, PlanPeak } from "./types"

/** The three windows, in the order the table draws them. */
export type PeakColumnKey = PeakWindowKey

/** One column of the peaks table: its heading and the words a screen reader hears. */
export type PeakColumn = {
	key: PeakColumnKey
	/** The short heading above the column. */
	label: string
	/** The window in words, for a screen reader. */
	spoken: string
}

export const PEAK_COLUMNS: readonly PeakColumn[] = Object.freeze([
	{ key: "fiveHours", label: "5 hours", spoken: "5 hours" },
	{ key: "sevenDays", label: "Week", spoken: "7 days" },
	{ key: "thirtyDays", label: "30 days", spoken: "30 days" },
])

/** One plan's row: its identity, its tier at the window's end, and the three figures. */
export type PeakTableRow = {
	plan: string
	planName: string
	tier: PlanTierLabel | null
	fiveHours: Peak | null
	sevenDays: Peak | null
	thirtyDays: Peak | null
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

/** The words a screen reader gets for one cell. */
export function peakSpoken(peak: Peak, column: PeakColumn): string {
	return `at least ${displayCount(peak.tokens)} tokens in ${column.spoken}, from ${peak.fromDay}`
}

function tableRow(entry: PlanPeak, day: string): PeakTableRow {
	return {
		plan: entry.plan,
		planName: planName(entry.plan),
		tier: planTier(entry.plan, day),
		fiveHours: entry.fiveHours,
		sevenDays: entry.sevenDays,
		thirtyDays: entry.thirtyDays,
		measured: measuredOf(entry),
	}
}

/**
 * The tiers a plan was measured on. A body cached before `measured` existed has none, so the
 * plan's own figures stand in as its current tier, and the page still renders.
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
