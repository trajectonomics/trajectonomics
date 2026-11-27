import type { D1Database } from "@cloudflare/workers-types"
import type { Granularity } from "@trajectonomics/data-collector/types"
import type { UsageFilter } from "../core/query"
import { nextDay } from "../core/rules"

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

/**
 * One plan's tokens at one UTC bucket, summed over models and machines and nothing else.
 * `tokens_total` leaves cache reads out, and `cache_read` holds them apart.
 */
export type PeakDbRow = {
	plan: string
	hour_utc: string
	granularity: Granularity
	tokens_total: number
	cache_read: number
}

/**
 * Reads every hourly and daily bucket up to and including `asOf`, one figure per plan and bucket.
 * `usage_hourly` keeps no series; its org rows are what the rollups' `measured-by-us` series is
 * built from, so the join selects the same rows the public rollups hold. Cache reads are summed
 * apart, so a cache-heavy hour never becomes the headline figure. The peaks core turns the hours
 * into a start day; no hour leaves this module.
 */
export async function readPeaks(db: D1Database, asOf: string): Promise<PeakDbRow[]> {
	const sql = `SELECT usage_hourly.plan AS plan, usage_hourly.hour_utc AS hour_utc,
		 usage_hourly.granularity AS granularity,
		 SUM(usage_hourly.tokens_total - COALESCE(usage_hourly.cache_read, 0)) AS tokens_total,
		 SUM(COALESCE(usage_hourly.cache_read, 0)) AS cache_read
		 FROM usage_hourly
		 JOIN contributor ON contributor.id = usage_hourly.contributor_id
		 WHERE contributor.kind = 'org' AND usage_hourly.hour_utc < ?
		 GROUP BY usage_hourly.plan, usage_hourly.hour_utc, usage_hourly.granularity
		 ORDER BY usage_hourly.hour_utc, usage_hourly.plan`
	const result = await db
		.prepare(sql)
		.bind(`${nextDay(asOf)}T00:00:00.000Z`)
		.all<PeakDbRow>()
	return result.results
}

/** The most recent accepted ingest time, or null when none has arrived. */
export async function readLastIngest(db: D1Database): Promise<string | null> {
	const row = await db
		.prepare("SELECT received_at FROM ingest_log ORDER BY received_at DESC LIMIT 1")
		.first<{ received_at: string }>()
	return row?.received_at ?? null
}
