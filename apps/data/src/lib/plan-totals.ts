import { comparePlans, planName } from "./plans"
import type { UsageRow } from "./types"

/** One plan's totals over the window, and its share of every plan's total. */
export type PlanTotal = {
	plan: string
	planName: string
	tokensTotal: number
	requests: number
	models: number
	share: number
	/** At least one of the plan's rows comes from a daily export. */
	daily: boolean
	/** At least one of the plan's rows comes from a best-effort source. */
	bestEffort: boolean
}

/** Every plan's totals added up, for the summary's closing row. */
export type GrandTotal = {
	tokensTotal: number
	requests: number
	/** 1 when any plan has tokens, else 0: the closing row's share column. */
	share: number
}

/** API rows to one total per plan over the window, in the plan table's order. */
export function planTotals(rows: readonly UsageRow[]): PlanTotal[] {
	const groups = new Map<string, UsageRow[]>()
	for (const row of rows) {
		const group = groups.get(row.plan) ?? []
		group.push(row)
		groups.set(row.plan, group)
	}
	const grand = sumOf(rows, (row) => row.tokensTotal)
	return [...groups.entries()]
		.map(([plan, group]) => {
			const tokensTotal = sumOf(group, (row) => row.tokensTotal)
			return {
				plan,
				planName: planName(plan),
				tokensTotal,
				requests: sumOf(group, (row) => row.requests),
				models: new Set(group.map((row) => row.model)).size,
				share: grand === 0 ? 0 : tokensTotal / grand,
				daily: group.some((row) => row.granularity === "day"),
				bestEffort: group.some((row) => row.bestEffort),
			}
		})
		.sort(comparePlans)
}

/** Every plan's tokens and requests added up. */
export function grandTotal(totals: readonly PlanTotal[]): GrandTotal {
	const tokensTotal = sumOf(totals, (total) => total.tokensTotal)
	return {
		tokensTotal,
		requests: sumOf(totals, (total) => total.requests),
		share: tokensTotal === 0 ? 0 : 1,
	}
}

/**
 * The source note a plan's row carries, or null when it needs none. It says "includes", because
 * one daily or best-effort row marks the plan while its other rows may be hourly and exact.
 */
export function planNote(total: Pick<PlanTotal, "daily" | "bestEffort">): string | null {
	const notes: string[] = []
	if (total.daily) notes.push("includes a daily export")
	if (total.bestEffort) notes.push("includes a best-effort source")
	return notes.length === 0 ? null : notes.join(" · ")
}

function sumOf<T>(items: readonly T[], value: (item: T) => number): number {
	let sum = 0
	for (const item of items) sum += value(item)
	return sum
}
