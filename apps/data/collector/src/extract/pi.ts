import { aggregateSamples } from "../aggregate"
import { matchPlan } from "../plans"
import type { CollectorContext, UsageRow, UsageSample } from "../types"
import { asNumber, asObject, asString, parseJsonLine } from "./parse"

function sampleFrom(line: string): UsageSample | null {
	const record = parseJsonLine(line)
	const message = asObject(record?.["message"])
	if (!message || asString(message["role"]) !== "assistant") return null
	const usage = asObject(message["usage"])
	const timestamp = asString(record?.["timestamp"]) ?? asString(message["timestamp"])
	if (!usage || !timestamp) return null
	const model = asString(message["model"]) ?? asString(message["modelId"]) ?? "unknown-pi"
	const provider = asString(message["provider"])
	return {
		plan: matchPlan(provider, model),
		model,
		timestamp,
		tokensIn: asNumber(usage["input"]),
		tokensOut: asNumber(usage["output"]),
		cacheRead: asNumber(usage["cacheRead"]),
		cacheWrite: asNumber(usage["cacheWrite"]),
		requests: 1,
		source: "pi-jsonl",
	}
}

/** Extracts Pi session usage, one sample per assistant message with a usage record. */
export function extractPi(
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
