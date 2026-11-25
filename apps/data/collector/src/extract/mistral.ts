import { aggregateSamples } from "../aggregate"
import { parseCsv } from "../csv"
import type { CollectorContext, UsageRow, UsageSample } from "../types"

function headerIndex(header: readonly string[]): Map<string, number> {
	const index = new Map<string, number>()
	header.forEach((name, position) => {
		index.set(name.replace(/^\uFEFF/, ""), position)
	})
	return index
}

function cell(row: readonly string[], index: number | undefined): string {
	return index === undefined ? "" : (row[index] ?? "")
}

function sampleFrom(row: readonly string[], index: Map<string, number>): UsageSample | null {
	const model = cell(row, index.get("billing_metric"))
	if (model.length === 0 || model === "web_search") return null
	const timestamp = cell(row, index.get("time_bucket"))
	const value = cell(row, index.get("value"))
	const total = Number(value)
	const requests = Number(cell(row, index.get("nb_api_calls")))
	if (timestamp.length === 0 || value.length === 0 || !Number.isFinite(total)) return null
	return {
		plan: "mistral",
		model,
		timestamp,
		granularity: "day",
		tokensIn: null,
		tokensOut: null,
		cacheRead: null,
		cacheWrite: null,
		tokensTotal: total,
		requests: Number.isFinite(requests) ? requests : 0,
		source: "mistral-console-csv",
	}
}

/** Extracts Mistral console CSV rows. Only billing metrics and totals are kept; ids are dropped. */
export function extractMistralCsv(text: string, context: CollectorContext): UsageRow[] {
	const rows = parseCsv(text)
	const header = rows[0]
	if (!header) return []
	const index = headerIndex(header)
	const samples: UsageSample[] = []
	for (const row of rows.slice(1)) {
		const sample = sampleFrom(row, index)
		if (sample) samples.push(sample)
	}
	return aggregateSamples(samples, context)
}
