import { blendedApiCost } from "./api-value"
import type { CachePlanRow } from "./cache-rate"
import { weeklyPriceOf } from "./plan-price"
import type { ScatterPoint } from "./scatter"
import { usageTable } from "./table"
import type { UsageRow } from "./types"
import { apiValuePerDollar, tokensPerDollar } from "./value"
import type { WeeklyFigure } from "./weekly"

/** A priced plan on the value chart: its two per-dollar figures and the week behind them. */
export type ValuePoint = ScatterPoint & {
	plan: string
	weekly: number
	tokensPerDollar: number
	apiValuePerDollar: number
}

/**
 * One dot per plan with both a weekly figure and a positive price. Tokens per $1 is the week's
 * tokens over the weekly price; API value per $1 prices the plan's own usage mix at list prices.
 * A free plan, an unpriced plan and a plan whose models all lack a price get no dot.
 */
export function valuePoints(
	week: readonly WeeklyFigure[],
	rows: readonly UsageRow[],
): ValuePoint[] {
	const table = usageTable(rows)
	const points: ValuePoint[] = []
	for (const figure of week) {
		const weekly = weeklyPriceOf(figure.plan, figure.tier)
		const blended = blendedApiCost(table.filter((row) => row.plan === figure.plan))
		const tokens = tokensPerDollar(figure.tokens, weekly)
		const value = apiValuePerDollar(figure.tokens, blended, weekly)
		if (tokens === null || value === null) continue
		points.push({
			key: figure.plan,
			label: figure.planName,
			plan: figure.plan,
			x: value,
			y: tokens,
			hollow: figure.kind !== "estimate",
			weekly: figure.tokens,
			tokensPerDollar: tokens,
			apiValuePerDollar: value,
		})
	}
	return points
}

/** The same priced plans on the cache chart: cache rate as a percentage against tokens per $1. */
export function cachePoints(
	points: readonly ValuePoint[],
	rows: readonly CachePlanRow[],
): ScatterPoint[] {
	const rate = new Map(rows.map((row) => [row.plan, row.rate]))
	return points.flatMap((point) => {
		const share = rate.get(point.plan)
		if (share === null || share === undefined) return []
		return [
			{
				key: point.key,
				label: point.label,
				x: share * 100,
				y: point.tokensPerDollar,
				hollow: point.hollow === true,
			},
		]
	})
}
