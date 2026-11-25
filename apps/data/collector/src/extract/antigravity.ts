import { aggregateSamples } from "../aggregate"
import type { CollectorContext, UsageRow, UsageSample } from "../types"
import type { JsonObject } from "./parse"
import { asNumber, asString, parseJsonLine } from "./parse"

/** One Antigravity transcript file, already read from disk. */
export type AntigravityFile = {
	conversationId: string
	fileName: string
	lines: Iterable<string>
}

type TranscriptRow = {
	conversationId: string
	timestamp: string
	model: string | null
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
}

function rowFrom(record: JsonObject | null, conversationId: string): TranscriptRow | null {
	const timestamp = asString(record?.["created_at"])
	const tokensIn = asNumber(record?.["input_tokens"])
	const tokensOut = asNumber(record?.["output_tokens"])
	const cacheRead = asNumber(record?.["cache_read_tokens"])
	if (!timestamp || (tokensIn === null && tokensOut === null && cacheRead === null)) return null
	return {
		conversationId,
		timestamp,
		model: asString(record?.["model"]),
		tokensIn,
		tokensOut,
		cacheRead,
	}
}

function rememberModel(
	seen: Map<string, Set<string>>,
	conversationId: string,
	model: string | null,
): void {
	if (!model) return
	const models = seen.get(conversationId) ?? new Set<string>()
	models.add(model)
	seen.set(conversationId, models)
}

function learnedModels(seen: Map<string, Set<string>>): Map<string, string> {
	const learned = new Map<string, string>()
	for (const [conversationId, models] of seen) {
		if (models.size === 1) {
			const only = [...models][0]
			if (only) learned.set(conversationId, only)
		}
	}
	return learned
}

/**
 * Extracts Antigravity planner responses. `transcript_full.jsonl` duplicates the same steps and
 * is skipped. A step without a model borrows its conversation's only model, else `unknown-gemini`.
 */
export function extractAntigravity(
	files: Iterable<AntigravityFile>,
	context: CollectorContext,
): UsageRow[] {
	const rows: TranscriptRow[] = []
	const seen = new Map<string, Set<string>>()
	for (const file of files) {
		if (file.fileName !== "transcript.jsonl") continue
		for (const line of file.lines) {
			const record = parseJsonLine(line)
			rememberModel(seen, file.conversationId, asString(record?.["model"]))
			const row = rowFrom(record, file.conversationId)
			if (row) rows.push(row)
		}
	}
	const learned = learnedModels(seen)
	const samples = rows.map<UsageSample>((row) => ({
		plan: "antigravity",
		model: row.model ?? learned.get(row.conversationId) ?? "unknown-gemini",
		timestamp: row.timestamp,
		tokensIn: row.tokensIn,
		tokensOut: row.tokensOut,
		cacheRead: row.cacheRead,
		cacheWrite: null,
		requests: 1,
		source: "antigravity-transcript",
	}))
	return aggregateSamples(samples, context)
}
