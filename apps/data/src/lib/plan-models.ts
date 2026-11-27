import { sumNullable, sumOf } from "./sum"
import type { UsageRow } from "./types"

/** One model's tokens over the window, with its cache reads counted apart. */
export type ModelTotal = {
	/** The model id exactly as the usage data gives it. */
	model: string
	/** Tokens without cache reads. */
	tokens: number
	cacheRead: number | null
	/** Cache reads as a fraction of the model's tokens; null when it reports none. */
	cacheReadShare: number | null
}

/** One plan's models over the window, ranked by tokens without cache reads. */
export function planModels(rows: readonly UsageRow[], plan: string): ModelTotal[] {
	const groups = new Map<string, UsageRow[]>()
	for (const row of rows) {
		if (row.plan !== plan) continue
		const group = groups.get(row.model) ?? []
		group.push(row)
		groups.set(row.model, group)
	}
	return [...groups.entries()]
		.map(([model, group]) => modelTotal(model, group))
		.sort((left, right) => right.tokens - left.tokens || left.model.localeCompare(right.model))
}

function modelTotal(model: string, group: readonly UsageRow[]): ModelTotal {
	const tokens = sumOf(group, (row) => row.tokensTotal - (row.cacheRead ?? 0))
	const cacheRead = sumNullable(group.map((row) => row.cacheRead))
	const all = tokens + (cacheRead ?? 0)
	return {
		model,
		tokens,
		cacheRead,
		cacheReadShare: cacheRead === null || all === 0 ? null : cacheRead / all,
	}
}
