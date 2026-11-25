import { aggregateSamples } from "../aggregate"
import type { CollectorContext, UsageRow, UsageSample } from "../types"
import { asNumber, asObject, asString } from "./parse"
import { parseT3Line } from "./t3-line"

type Occurrence = { key: string; outputTokens: number; sample: UsageSample }

function occurrenceFrom(line: string): Occurrence | null {
	const record = parseT3Line(line)
	if (!record || asString(record.payload["provider"]) !== "cursor") return null
	const event = asObject(record.payload["event"])
	const payload = asObject(event?.["payload"])
	const update = asObject(payload?.["update"])
	if (asString(update?.["type"]) !== "turn-ended") return null
	const usage = asObject(update?.["usage"])
	if (!usage) return null
	const input = asNumber(usage["inputTokens"]) ?? 0
	const cacheRead = asNumber(usage["cacheReadTokens"]) ?? 0
	const outputTokens = asNumber(usage["outputTokens"]) ?? 0
	const runId = asString(payload?.["runId"])
	const key = runId ?? `${record.timestamp}:${input}:${cacheRead}:${outputTokens}`
	return {
		key,
		outputTokens,
		sample: {
			plan: "cursor",
			model: "unknown-cursor",
			timestamp: record.timestamp,
			tokensIn: Math.max(input - cacheRead, 0),
			// T3 forwards the Cursor SDK usage object; outputTokens already includes
			// reasoningTokens, so reasoning is not added again.
			tokensOut: outputTokens,
			cacheRead,
			cacheWrite: asNumber(usage["cacheWriteTokens"]),
			requests: 1,
			source: "t3-provider-log",
		},
	}
}

/**
 * Extracts Cursor usage from T3 Code logs, used only on machines whose Cursor store has no
 * `usage_json`, so the same Cursor run is never counted twice.
 */
export function extractT3Cursor(
	files: Iterable<Iterable<string>>,
	context: CollectorContext,
): UsageRow[] {
	const best = new Map<string, Occurrence>()
	for (const lines of files) {
		for (const line of lines) {
			const occurrence = occurrenceFrom(line)
			if (!occurrence) continue
			const current = best.get(occurrence.key)
			if (!current || occurrence.outputTokens > current.outputTokens) {
				best.set(occurrence.key, occurrence)
			}
		}
	}
	return aggregateSamples(
		[...best.values()].map((entry) => entry.sample),
		context,
	)
}
