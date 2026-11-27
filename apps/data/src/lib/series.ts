import { comparePlans, planName } from "./plans"
import type { ChartSeries, UsageRow } from "./types"

/**
 * API rows to one line per plan over the window. A day with no row plots zero, so every line
 * covers the same 30 days; a plan with no row at all has no line.
 */
export function chartSeries(rows: readonly UsageRow[], days: readonly string[]): ChartSeries[] {
	const wanted = new Set(days)
	const totals = new Map<string, Map<string, number>>()
	for (const row of rows) {
		if (!wanted.has(row.day)) continue
		const byDay = totals.get(row.plan) ?? new Map<string, number>()
		byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.tokensTotal)
		totals.set(row.plan, byDay)
	}
	return [...totals.entries()]
		.map(([plan, byDay]) => ({
			plan,
			name: planName(plan),
			total: days.reduce((sum, day) => sum + (byDay.get(day) ?? 0), 0),
			points: days.map((day) => ({ day, tokens: byDay.get(day) ?? 0 })),
		}))
		.sort(comparePlans)
}
