import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types"
import type { UsageRow } from "@trajectonomics/data-collector/types"
import type { QuotaSample, RollupRow } from "../core/types"

const USAGE_UPSERT = `
INSERT INTO usage_hourly (
	contributor_id, machine, plan, model, hour_utc, granularity,
	tokens_in, tokens_out, cache_read, cache_write, tokens_total,
	requests, source, best_effort, received_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (contributor_id, machine, plan, model, hour_utc, source) DO UPDATE SET
	granularity = excluded.granularity,
	tokens_in = excluded.tokens_in,
	tokens_out = excluded.tokens_out,
	cache_read = excluded.cache_read,
	cache_write = excluded.cache_write,
	tokens_total = excluded.tokens_total,
	requests = excluded.requests,
	best_effort = excluded.best_effort,
	received_at = excluded.received_at
`

const QUOTA_UPSERT = `
INSERT INTO quota_sample (contributor_id, plan, window, sampled_at, used_pct, resets_at, received_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (contributor_id, plan, window, sampled_at) DO UPDATE SET
	used_pct = excluded.used_pct,
	resets_at = excluded.resets_at,
	received_at = excluded.received_at
`

const ROLLUP_INSERT = `
INSERT INTO rollup_daily (
	series, day, plan, model, tokens_in, tokens_out, cache_read, cache_write,
	tokens_total, requests, granularity, best_effort
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

/** One prepared upsert for a usage row. */
export function usageStatement(
	db: D1Database,
	contributorId: UsageRow["contributor"],
	row: UsageRow,
	receivedAt: string,
): D1PreparedStatement {
	return db
		.prepare(USAGE_UPSERT)
		.bind(
			contributorId,
			row.machine,
			row.plan,
			row.model,
			row.hourUtc,
			row.granularity,
			row.tokensIn,
			row.tokensOut,
			row.cacheRead,
			row.cacheWrite,
			row.tokensTotal,
			row.requests,
			row.source,
			row.bestEffort ? 1 : 0,
			receivedAt,
		)
}

/** One prepared upsert for a quota sample. */
export function quotaStatement(
	db: D1Database,
	contributorId: QuotaSample["contributor"],
	row: QuotaSample,
	receivedAt: string,
): D1PreparedStatement {
	return db
		.prepare(QUOTA_UPSERT)
		.bind(contributorId, row.plan, row.window, row.sampledAt, row.usedPct, row.resetsAt, receivedAt)
}

/** Deletes one day's rollup rows before they are rebuilt. */
export function rollupDelete(db: D1Database, series: string, day: string): D1PreparedStatement {
	return db.prepare("DELETE FROM rollup_daily WHERE series = ? AND day = ?").bind(series, day)
}

/** One prepared insert for a rebuilt rollup row. */
export function rollupInsert(db: D1Database, row: RollupRow): D1PreparedStatement {
	return db
		.prepare(ROLLUP_INSERT)
		.bind(
			row.series,
			row.day,
			row.plan,
			row.model,
			row.tokensIn,
			row.tokensOut,
			row.cacheRead,
			row.cacheWrite,
			row.tokensTotal,
			row.requests,
			row.granularity,
			row.bestEffort ? 1 : 0,
		)
}

/** One prepared append to the ingest log. */
export function logStatement(
	db: D1Database,
	contributorId: string,
	receivedAt: string,
	rows: number,
): D1PreparedStatement {
	return db
		.prepare(
			"INSERT INTO ingest_log (contributor_id, received_at, rows, status) VALUES (?, ?, ?, ?)",
		)
		.bind(contributorId, receivedAt, rows, "accepted")
}
