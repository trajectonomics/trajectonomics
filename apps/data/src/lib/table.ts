import { comparePlans, planName } from "./plans"
import type { UsageRow } from "./types"

/** One plan and model's totals over the window. */
export type TableRow = {
	plan: string
	planName: string
	model: string
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
	tokensTotal: number
	requests: number
	daily: boolean
	bestEffort: boolean
}

function sumNullable(values: readonly (number | null)[]): number | null {
	let sum = 0
	let seen = false
	for (const value of values) {
		if (value === null) continue
		sum += value
		seen = true
	}
	return seen ? sum : null
}

/**
 * API rows to one row per plan and model over the window. A null part stays null only when every
 * contributing row has no value; tokens and requests always have one.
 */
export function usageTable(rows: readonly UsageRow[]): TableRow[] {
	const groups = new Map<string, UsageRow[]>()
	for (const row of rows) {
		const key = `${row.plan}\u0000${row.model}`
		const group = groups.get(key) ?? []
		group.push(row)
		groups.set(key, group)
	}
	return [...groups.values()]
		.map((group) => {
			const first = group[0] as UsageRow
			return {
				plan: first.plan,
				planName: planName(first.plan),
				model: first.model,
				tokensIn: sumNullable(group.map((row) => row.tokensIn)),
				tokensOut: sumNullable(group.map((row) => row.tokensOut)),
				cacheRead: sumNullable(group.map((row) => row.cacheRead)),
				cacheWrite: sumNullable(group.map((row) => row.cacheWrite)),
				tokensTotal: group.reduce((sum, row) => sum + row.tokensTotal, 0),
				requests: group.reduce((sum, row) => sum + row.requests, 0),
				daily: group.some((row) => row.granularity === "day"),
				bestEffort: group.some((row) => row.bestEffort),
			}
		})
		.sort((a, b) => comparePlans(a, b) || a.model.localeCompare(b.model))
}

/** The source note a row carries, or null when it needs none. */
export function rowNote(row: TableRow): string | null {
	const notes: string[] = []
	if (row.daily) notes.push("daily export, no in/out split")
	if (row.bestEffort) notes.push("best-effort source")
	return notes.length === 0 ? null : notes.join(" · ")
}
