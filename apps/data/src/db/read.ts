import type { D1Database } from "@cloudflare/workers-types"
import type { Granularity, UsageRow } from "@trajectonomics/data-collector/types"
import type { UsageFilter } from "../core/query"

type UsageDbRow = {
	machine: string
	plan: string
	model: string
	hour_utc: string
	granularity: Granularity
	tokens_in: number | null
	tokens_out: number | null
	cache_read: number | null
	cache_write: number | null
	tokens_total: number
	requests: number
	source: string
	best_effort: number
}

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

function toUsageRow(row: UsageDbRow, contributor: UsageRow["contributor"]): UsageRow {
	return {
		contributor,
		machine: row.machine,
		plan: row.plan,
		model: row.model,
		hourUtc: row.hour_utc,
		granularity: row.granularity,
		tokensIn: row.tokens_in,
		tokensOut: row.tokens_out,
		cacheRead: row.cache_read,
		cacheWrite: row.cache_write,
		tokensTotal: row.tokens_total,
		requests: row.requests,
		source: row.source,
		bestEffort: row.best_effort !== 0,
	}
}

/** The UTC day after a `YYYY-MM-DD` day. */
export function nextDay(day: string): string {
	return new Date(Date.parse(`${day}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10)
}

/** Reads every stored usage row for one contributor and UTC day. */
export async function readUsageDay(
	db: D1Database,
	contributor: UsageRow["contributor"],
	day: string,
): Promise<UsageRow[]> {
	const start = `${day}T00:00:00.000Z`
	const end = `${nextDay(day)}T00:00:00.000Z`
	const result = await db
		.prepare(
			`SELECT machine, plan, model, hour_utc, granularity, tokens_in, tokens_out,
			 cache_read, cache_write, tokens_total, requests, source, best_effort
			 FROM usage_hourly
			 WHERE contributor_id = ? AND hour_utc >= ? AND hour_utc < ?
			 ORDER BY machine, plan, model, hour_utc, source`,
		)
		.bind(contributor, start, end)
		.all<UsageDbRow>()
	return result.results.map((row) => toUsageRow(row, contributor))
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
