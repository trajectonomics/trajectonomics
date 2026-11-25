import type { D1Database } from "@cloudflare/workers-types"
import type { Granularity } from "@trajectonomics/data-collector/types"
import type { UsageFilter } from "../core/query"

/** The rollup columns the public API serves; no machine, contributor or hour. */
export type RollupDbRow = {
	day: string
	plan: string
	model: string
	tokens_in: number | null
	tokens_out: number | null
	cache_read: number | null
	cache_write: number | null
	tokens_total: number
	requests: number
	granularity: Granularity
	best_effort: number
}

/** Reads the rollups the public API may serve, filtered by day, plan and model. */
export async function readRollups(db: D1Database, filter: UsageFilter): Promise<RollupDbRow[]> {
	const clauses = ["series = ?"]
	const values: unknown[] = [filter.series]
	if (filter.from !== null) {
		clauses.push("day >= ?")
		values.push(filter.from)
	}
	if (filter.to !== null) {
		clauses.push("day <= ?")
		values.push(filter.to)
	}
	if (filter.plan !== null) {
		clauses.push("plan = ?")
		values.push(filter.plan)
	}
	if (filter.model !== null) {
		clauses.push("model = ?")
		values.push(filter.model)
	}
	const sql = `SELECT day, plan, model, tokens_in, tokens_out, cache_read, cache_write,
		 tokens_total, requests, granularity, best_effort
		 FROM rollup_daily WHERE ${clauses.join(" AND ")} ORDER BY day, plan, model`
	const result = await db
		.prepare(sql)
		.bind(...values)
		.all<RollupDbRow>()
	return result.results
}

/** The most recent accepted ingest time, or null when none has arrived. */
export async function readLastIngest(db: D1Database): Promise<string | null> {
	const row = await db
		.prepare("SELECT received_at FROM ingest_log ORDER BY received_at DESC LIMIT 1")
		.first<{ received_at: string }>()
	return row?.received_at ?? null
}
