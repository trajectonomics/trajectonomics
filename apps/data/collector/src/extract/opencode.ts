import { aggregateSamples } from "../aggregate"
import { matchPlan } from "../plans"
import type { OpenCodeRow } from "../stores/opencode"
import type { CollectorContext, UsageRow, UsageSample } from "../types"
import { asNumber, asObject, asString, parseJsonLine } from "./parse"

function outputWithReasoning(tokens: Record<string, unknown>): number | null {
	const output = asNumber(tokens["output"])
	const reasoning = asNumber(tokens["reasoning"])
	if (output === null && reasoning === null) return null
	return (output ?? 0) + (reasoning ?? 0)
}

function sampleFromMessage(row: OpenCodeRow): UsageSample | null {
	const data = parseJsonLine(row.data)
	if (!data || asString(data["role"]) !== "assistant") return null
	const tokens = asObject(data["tokens"])
	if (!tokens) return null
	const cache = asObject(tokens["cache"])
	const time = asObject(data["time"])
	const model = asString(data["modelID"]) ?? "unknown-opencode"
	return {
		plan: matchPlan(asString(data["providerID"]), model),
		model,
		timestamp: asNumber(time?.["created"]) ?? row.timeCreated,
		tokensIn: asNumber(tokens["input"]),
		tokensOut: outputWithReasoning(tokens),
		cacheRead: asNumber(cache?.["read"]),
		cacheWrite: asNumber(cache?.["write"]),
		requests: 1,
		source: "opencode-db",
	}
}

function sampleFromSessionMessage(row: OpenCodeRow): UsageSample | null {
	const data = parseJsonLine(row.data)
	if (!data) return null
	const tokens = asObject(data["tokens"])
	if (!tokens) return null
	const modelValue = data["model"]
	const model = asObject(modelValue)
	const cache = asObject(tokens["cache"])
	const time = asObject(data["time"])
	const modelId = asString(model?.["id"]) ?? asString(modelValue) ?? "unknown-opencode"
	return {
		plan: matchPlan(asString(model?.["providerID"]), modelId),
		model: modelId,
		timestamp: asNumber(time?.["created"]) ?? row.timeCreated,
		tokensIn: asNumber(tokens["input"]),
		tokensOut: outputWithReasoning(tokens),
		cacheRead: asNumber(cache?.["read"]),
		cacheWrite: asNumber(cache?.["write"]),
		requests: 1,
		source: "opencode-db",
	}
}

/** Extracts usage from either OpenCode message schema, deduplicating a message id across both. */
export function extractOpenCode(
	rows: readonly OpenCodeRow[],
	context: CollectorContext,
): UsageRow[] {
	const byId = new Map<string, UsageSample>()
	for (const row of rows) {
		const sample = row.schema === "message" ? sampleFromMessage(row) : sampleFromSessionMessage(row)
		if (sample) byId.set(row.id, sample)
	}
	return aggregateSamples([...byId.values()], context)
}
