import { planName, planRank } from "./plans"
import { sumNullable } from "./table"
import type { UsageRow } from "./types"

/** One plan's totals over the window, and its share of every plan's total. */
export type PlanTotal = {
	plan: string
	planName: string
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
	tokensTotal: number
	requests: number
	models: number
	share: number
	daily: boolean
	bestEffort: boolean
}

/**
 * API rows to one total per plan over the window. A null part stays null only when every
 * contributing row has no value; tokens and requests always have one.
 */
export function planTotals(rows: readonly UsageRow[]): PlanTotal[] {
	const groups = new Map<string, UsageRow[]>()
	for (const row of rows) {
		const group = groups.get(row.plan) ?? []
		group.push(row)
		groups.set(row.plan, group)
	}
	const grand = sumOf(groups.values(), (group) => sumOf(group, (row) => row.tokensTotal))
	return [...groups.entries()]
		.map(([plan, group]) => {
			const tokensTotal = sumOf(group, (row) => row.tokensTotal)
			return {
				plan,
				planName: planName(plan),
				tokensIn: sumNullable(group.map((row) => row.tokensIn)),
				tokensOut: sumNullable(group.map((row) => row.tokensOut)),
				cacheRead: sumNullable(group.map((row) => row.cacheRead)),
				cacheWrite: sumNullable(group.map((row) => row.cacheWrite)),
				tokensTotal,
				requests: sumOf(group, (row) => row.requests),
				models: new Set(group.map((row) => row.model)).size,
				share: grand === 0 ? 0 : tokensTotal / grand,
				daily: group.some((row) => row.granularity === "day"),
				bestEffort: group.some((row) => row.bestEffort),
			}
		})
		.sort((a, b) => planRank(a.plan) - planRank(b.plan) || a.plan.localeCompare(b.plan))
}

/** Every plan's totals added up, for the summary's closing row. */
export function grandTotal(totals: readonly PlanTotal[]): {
	tokensTotal: number
	requests: number
} {
	return {
		tokensTotal: sumOf(totals, (total) => total.tokensTotal),
		requests: sumOf(totals, (total) => total.requests),
	}
}

function sumOf<T>(items: Iterable<T>, value: (item: T) => number): number {
	let sum = 0
	for (const item of items) sum += value(item)
	return sum
}
