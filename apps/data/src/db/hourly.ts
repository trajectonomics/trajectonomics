import type { D1Database } from "@cloudflare/workers-types"
import { nextDay } from "../core/rules"

/**
 * One plan's summed tokens at one UTC hour, with the machine and model columns already added
 * away. `tokens_total` keeps the rollup's meaning, cache reads included.
 */
export type HourlyDbRow = {
	plan: string
	hour_utc: string
	tokens_total: number
	requests: number
}

/**
 * Reads the org's hourly rows for the inclusive days `from`..`to`, summed per plan and UTC hour.
 * Only `granularity = 'hour'` rows are read, so a day-only plan (Mistral) has no line here; no
 * machine, model or contributor column leaves this module.
 */
export async function readHourly(db: D1Database, from: string, to: string): Promise<HourlyDbRow[]> {
	const sql = `SELECT usage_hourly.plan AS plan, usage_hourly.hour_utc AS hour_utc,
		 SUM(usage_hourly.tokens_total) AS tokens_total, SUM(usage_hourly.requests) AS requests
		 FROM usage_hourly JOIN contributor ON contributor.id = usage_hourly.contributor_id
		 WHERE contributor.kind = 'org' AND usage_hourly.granularity = 'hour'
		   AND usage_hourly.hour_utc >= ? AND usage_hourly.hour_utc < ?
		 GROUP BY usage_hourly.plan, usage_hourly.hour_utc
		 ORDER BY usage_hourly.hour_utc, usage_hourly.plan`
	const result = await db
		.prepare(sql)
		.bind(`${from}T00:00:00.000Z`, `${nextDay(to)}T00:00:00.000Z`)
		.all<HourlyDbRow>()
	return result.results
}
