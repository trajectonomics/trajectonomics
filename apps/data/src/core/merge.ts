import type { UsageRow } from "@trajectonomics/data-collector/types"

/** The identity of one hourly usage row: a replay updates the same row. */
export function usageKey(
	row: Pick<UsageRow, "machine" | "plan" | "model" | "hourUtc" | "source">,
): string {
	return [row.machine, row.plan, row.model, row.hourUtc, row.source].join("\u0000")
}

/** Merges incoming rows over stored rows by their key, without mutating either input. */
export function mergeUsage(
	existing: readonly UsageRow[],
	incoming: readonly UsageRow[],
): UsageRow[] {
	const byKey = new Map<string, UsageRow>()
	for (const row of existing) byKey.set(usageKey(row), row)
	for (const row of incoming) byKey.set(usageKey(row), row)
	return [...byKey.values()]
}
