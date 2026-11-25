import { aggregateSamples } from "../aggregate"
import type { CollectorContext, UsageRow, UsageSample } from "../types"
import { asNumber, asObject } from "./parse"
import { extractT3Cursor } from "./t3-cursor"

/** One Cursor run row from a Cursor SDK agent store database. */
export type CursorRun = {
	runId: string
	model: string | null
	usageJson: string | null
	createdAt: string
}

/** The inputs for the one-source Cursor choice, with all I/O already done. */
export type CursorSourceInput = {
	/** Whether any store has populated usage, checked without the `--since` filter. */
	storeHasUsage: boolean
	/** Rows from the store inside the `--since` window. */
	storeRows: readonly CursorRun[]
	t3Files: Iterable<Iterable<string>>
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
		// Cursor's outputTokens already includes reasoningTokens: totalTokens is
		// inputTokens + outputTokens in every inspected run, so reasoning is not added again.
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

/**
 * Chooses exactly one Cursor source. The store wins whenever it has any populated usage, even
 * when the `--since` window leaves it empty, so a Cursor run is never counted from both places.
 */
export function chooseCursorUsage(input: CursorSourceInput, context: CollectorContext): UsageRow[] {
	return input.storeHasUsage
		? extractCursor(input.storeRows, context)
		: extractT3Cursor(input.t3Files, context)
}
