import { aggregateSamples } from "../aggregate"
import { matchPlan } from "../plans"
import type { CollectorContext, UsageRow, UsageSample } from "../types"
import { asNumber, asObject, asString } from "./parse"
import { parseT3Line } from "./t3-line"

function sampleFrom(line: string): UsageSample | null {
	const record = parseT3Line(line)
	if (!record || asString(record.payload["provider"]) !== "muse") return null
	if (asString(record.payload["method"]) !== "session/tokenUsage") return null
	const params = asObject(record.payload["params"])
	const usage = asObject(params?.["usage"])
	if (!usage) return null
	const model = asString(params?.["modelId"]) ?? "unknown-muse"
	const input = asNumber(usage["inputTokens"]) ?? 0
	const cacheRead = asNumber(usage["cacheReadTokens"]) ?? 0
	return {
		plan: matchPlan("muse", model),
		model,
		timestamp: record.timestamp,
		// Muse reports inputTokens including the cached prompt, like Cursor.
		tokensIn: Math.max(input - cacheRead, 0),
		tokensOut: asNumber(usage["outputTokens"]),
		cacheRead,
		cacheWrite: asNumber(usage["cacheWriteTokens"]),
		requests: 1,
		source: "t3-provider-log",
		bestEffort: true,
	}
}

/**
 * Extracts Meta (Muse) usage from T3 Code provider logs. T3's `claudeAgent` lines are ignored
 * because Claude Code's own logs are the Claude source.
 */
export function extractT3Muse(
	files: Iterable<Iterable<string>>,
	context: CollectorContext,
): UsageRow[] {
	const samples: UsageSample[] = []
	for (const lines of files) {
		for (const line of lines) {
			const sample = sampleFrom(line)
			if (sample) samples.push(sample)
		}
	}
	return aggregateSamples(samples, context)
}
