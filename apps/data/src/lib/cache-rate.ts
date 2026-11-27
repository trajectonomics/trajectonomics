import type { PlanTotal } from "./plan-totals"
import { comparePlans } from "./plans"
import { rankBy } from "./rank"
import { type TableRow, usageTable } from "./table"
import type { UsageRow } from "./types"

/** The plan fields a cache table needs, which a `PlanTotal` already carries. */
export type CacheSource = Pick<
	PlanTotal,
	| "plan"
	| "planName"
	| "tokensIn"
	| "tokensOut"
	| "cacheRead"
	| "cacheWrite"
	| "tokensTotal"
	| "cacheReadShare"
>

/** One model's parts over the window and its share served from cache. */
export type CacheModelRow = {
	model: string
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
	tokensTotal: number
	/** Cache reads over all tokens; null when the source reports no cache split. */
	rate: number | null
}

/** One plan's row, with its models nested beneath it. */
export type CachePlanRow = Omit<CacheModelRow, "model"> & {
	plan: string
	planName: string
	models: CacheModelRow[]
}

function rateOf(cacheRead: number | null, tokensTotal: number): number | null {
	if (cacheRead === null || tokensTotal <= 0) return null
	return cacheRead / tokensTotal
}

function modelRow(row: TableRow): CacheModelRow {
	return {
		model: row.model,
		tokensIn: row.tokensIn,
		tokensOut: row.tokensOut,
		cacheRead: row.cacheRead,
		cacheWrite: row.cacheWrite,
		tokensTotal: row.tokensTotal,
		rate: rateOf(row.cacheRead, row.tokensTotal),
	}
}

/**
 * The cache-rate table: one row per plan with its models nested, sorted by cache rate, highest
 * first. A plan whose source reports no cache split sorts last and says so.
 */
export function cacheRateRows(
	totals: readonly CacheSource[],
	rows: readonly UsageRow[],
): CachePlanRow[] {
	const table = usageTable(rows)
	const ordered = [...totals].sort(comparePlans)
	const list = ordered.map((total) => ({
		plan: total.plan,
		planName: total.planName,
		tokensIn: total.tokensIn,
		tokensOut: total.tokensOut,
		cacheRead: total.cacheRead,
		cacheWrite: total.cacheWrite,
		tokensTotal: total.tokensTotal,
		rate: total.cacheReadShare,
		models: table
			.filter((row) => row.plan === total.plan)
			.map(modelRow)
			.sort((left, right) => right.tokensTotal - left.tokensTotal),
	}))
	return rankBy(list, (row) => row.rate)
}
