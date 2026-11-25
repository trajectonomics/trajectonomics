import type { RollupDbRow } from "../db/read"

/** One row of the public usage API; it carries no machine, contributor or hour. */
type ApiRow = {
	day: string
	plan: string
	model: string
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
	tokensTotal: number
	requests: number
	granularity: "hour" | "day"
	bestEffort: boolean
}

function toApiRow(row: RollupDbRow): ApiRow {
	return {
		day: row.day,
		plan: row.plan,
		model: row.model,
		tokensIn: row.tokens_in,
		tokensOut: row.tokens_out,
		cacheRead: row.cache_read,
		cacheWrite: row.cache_write,
		tokensTotal: row.tokens_total,
		requests: row.requests,
		granularity: row.granularity,
		bestEffort: row.best_effort !== 0,
	}
}

/** The JSON body of a successful read. */
export function usagePayload(asOf: string, series: string, rows: RollupDbRow[]) {
	return { asOf, methodVersion: 1, series, rows: rows.map(toApiRow) }
}
