import { aggregateSamples } from "../aggregate"
import type { CollectorContext, UsageRow, UsageSample } from "../types"
import { asNumber, asObject } from "./parse"

/** One Cursor run row from a Cursor SDK agent store database. */
export type CursorRun = {
	runId: string
	model: string | null
	usageJson: string | null
	createdAt: string
}

function sampleFrom(run: CursorRun): UsageSample | null {
	if (!run.usageJson) return null
	const usage = asObject(JSON.parse(run.usageJson))
	if (!usage) return null
	const input = asNumber(usage["inputTokens"])
	const cacheRead = asNumber(usage["cacheReadTokens"])
	return {
		plan: "cursor",
		model: run.model ?? "unknown-cursor",
		timestamp: run.createdAt,
		// Cursor's inputTokens includes the cached prompt, while UsageRow keeps the parts apart.
		tokensIn: input === null ? null : Math.max(input - (cacheRead ?? 0), 0),
		tokensOut: asNumber(usage["outputTokens"]),
		cacheRead,
		cacheWrite: asNumber(usage["cacheWriteTokens"]),
		requests: 1,
		source: "cursor-sdk",
	}
}

/** Extracts Cursor usage from `runs` rows whose `usage_json` is populated. */
export function extractCursor(runs: readonly CursorRun[], context: CollectorContext): UsageRow[] {
	const samples: UsageSample[] = []
	for (const run of runs) {
		try {
			const sample = sampleFrom(run)
			if (sample) samples.push(sample)
		} catch {
			// A malformed usage_json only drops that run.
		}
	}
	return aggregateSamples(samples, context)
}
