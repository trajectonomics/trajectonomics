import type { RollupRow, UsageForRollup } from "./types"

/** The UTC days a set of usage rows touches, sorted. */
export function affectedDays(usage: readonly Pick<UsageForRollup, "hourUtc">[]): string[] {
	const days = new Set<string>()
	for (const row of usage) days.add(row.hourUtc.slice(0, 10))
	return [...days].sort()
}

function addNullable(a: number | null, b: number | null): number | null {
	if (a === null) return b
	if (b === null) return a
	return a + b
}

function addRow(target: RollupRow, row: UsageForRollup): void {
	target.tokensIn = addNullable(target.tokensIn, row.tokensIn)
	target.tokensOut = addNullable(target.tokensOut, row.tokensOut)
	target.cacheRead = addNullable(target.cacheRead, row.cacheRead)
	target.cacheWrite = addNullable(target.cacheWrite, row.cacheWrite)
	target.tokensTotal += row.tokensTotal
	target.requests += row.requests
	if (row.granularity === "day") target.granularity = "day"
	target.bestEffort = target.bestEffort || row.bestEffort
}

function compare(a: RollupRow, b: RollupRow): number {
	return (
		a.day.localeCompare(b.day) || a.plan.localeCompare(b.plan) || a.model.localeCompare(b.model)
	)
}

/** Builds one rollup per UTC day, plan and model from the day's usage rows. */
export function buildRollups(usage: readonly UsageForRollup[], series: string): RollupRow[] {
	const groups = new Map<string, RollupRow>()
	for (const row of usage) {
		const day = row.hourUtc.slice(0, 10)
		const key = [day, row.plan, row.model].join("\u0000")
		const current = groups.get(key)
		if (current !== undefined) {
			addRow(current, row)
			continue
		}
		groups.set(key, {
			series,
			day,
			plan: row.plan,
			model: row.model,
			tokensIn: row.tokensIn,
			tokensOut: row.tokensOut,
			cacheRead: row.cacheRead,
			cacheWrite: row.cacheWrite,
			tokensTotal: row.tokensTotal,
			requests: row.requests,
			granularity: row.granularity,
			bestEffort: row.bestEffort,
		})
	}
	return [...groups.values()].sort(compare)
}
