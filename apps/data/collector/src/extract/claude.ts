import { aggregateSamples } from "../aggregate"
import type { CollectorContext, UsageRow, UsageSample } from "../types"
import { asNumber, asObject, asString, parseJsonLine } from "./parse"

type Occurrence = { outputTokens: number; sample: UsageSample }

function occurrenceFrom(line: string): { requestId: string; occurrence: Occurrence } | null {
	const record = parseJsonLine(line)
	if (!record) return null
	const requestId = asString(record["requestId"])
	const timestamp = asString(record["timestamp"])
	const message = asObject(record["message"])
	const usage = asObject(message?.["usage"])
	const model = asString(message?.["model"])
	if (!requestId || !timestamp || !usage || !model || model === "<synthetic>") return null
	const outputTokens = asNumber(usage["output_tokens"]) ?? 0
	return {
		requestId,
		occurrence: {
			outputTokens,
			sample: {
				plan: "claude",
				model,
				timestamp,
				tokensIn: asNumber(usage["input_tokens"]),
				tokensOut: outputTokens,
				cacheRead: asNumber(usage["cache_read_input_tokens"]),
				cacheWrite: asNumber(usage["cache_creation_input_tokens"]),
				requests: 1,
				source: "claude-code",
			},
		},
	}
}

/**
 * Extracts Claude Code usage, keeping only the occurrence with the largest output for each
 * requestId because streaming repeats one request's usage several times.
 */
export function extractClaude(
	files: Iterable<Iterable<string>>,
	context: CollectorContext,
): UsageRow[] {
	const best = new Map<string, Occurrence>()
	for (const lines of files) {
		for (const line of lines) {
			const parsed = occurrenceFrom(line)
			if (!parsed) continue
			const current = best.get(parsed.requestId)
			if (!current || parsed.occurrence.outputTokens > current.outputTokens) {
				best.set(parsed.requestId, parsed.occurrence)
			}
		}
	}
	return aggregateSamples(
		[...best.values()].map((entry) => entry.sample),
		context,
	)
}
