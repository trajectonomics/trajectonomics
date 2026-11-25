import { aggregateSamples } from "../aggregate"
import { matchPlan } from "../plans"
import type { CollectorContext, UsageRow, UsageSample } from "../types"
import { asNumber, asObject, asString, type JsonObject } from "./parse"
import { parseT3Line } from "./t3-line"

type MuseEvent = { key: string; sample: UsageSample }

function eventKey(
	sessionId: string,
	params: JsonObject,
	usage: JsonObject,
	timestamp: string,
): string {
	const range = asObject(params["sourceRange"])
	const first = asString(asObject(range?.["first"])?.["id"])
	const last = asString(asObject(range?.["last"])?.["id"])
	if (first !== null || last !== null) {
		const stream = asString(range?.["stream"]) ?? ""
		return [sessionId, first ?? "", last ?? "", stream].join("\u0000")
	}
	// A line without a source range can only be identified by its turn and usage.
	return [sessionId, asString(params["turnId"]) ?? "", timestamp, JSON.stringify(usage)].join(
		"\u0000",
	)
}

function eventFrom(line: string): MuseEvent | null {
	const record = parseT3Line(line)
	if (!record || asString(record.payload["provider"]) !== "muse") return null
	if (asString(record.payload["method"]) !== "session/tokenUsage") return null
	const params = asObject(record.payload["params"])
	if (!params) return null
	const usage = asObject(params["usage"])
	if (!usage) return null
	const model = asString(params["modelId"]) ?? "unknown-muse"
	const input = asNumber(usage["inputTokens"]) ?? 0
	const cacheRead = asNumber(usage["cacheReadTokens"]) ?? 0
	const sessionId =
		asString(params["sessionId"]) ?? asString(record.payload["providerSessionId"]) ?? ""
	return {
		key: eventKey(sessionId, params, usage, record.timestamp),
		sample: {
			plan: matchPlan("muse", model),
			model,
			timestamp: record.timestamp,
			// Muse reports inputTokens including the cached prompt, like Cursor.
			tokensIn: Math.max(input - cacheRead, 0),
			// Muse's outputTokens already includes reasoningTokens: totalTokens is
			// inputTokens + outputTokens in every inspected event, so reasoning is not added again.
			tokensOut: asNumber(usage["outputTokens"]),
			cacheRead,
			cacheWrite: asNumber(usage["cacheWriteTokens"]),
			requests: 1,
			source: "t3-provider-log",
			bestEffort: true,
		},
	}
}

/**
 * Extracts Meta (Muse) usage from T3 Code provider logs. Each `session/tokenUsage` event carries
 * one model call's delta in `params.usage`; `params.cumulative` is a running session total and is
 * deliberately ignored. An event is identified by its session and `sourceRange` ids, because one
 * turn can contain several calls and `turnId` alone would merge them. T3's `claudeAgent` lines are
 * ignored because Claude Code's own logs are the Claude source.
 */
export function extractT3Muse(
	files: Iterable<Iterable<string>>,
	context: CollectorContext,
): UsageRow[] {
	const seen = new Set<string>()
	const samples: UsageSample[] = []
	for (const lines of files) {
		for (const line of lines) {
			const event = eventFrom(line)
			if (!event || seen.has(event.key)) continue
			seen.add(event.key)
			samples.push(event.sample)
		}
	}
	return aggregateSamples(samples, context)
}
