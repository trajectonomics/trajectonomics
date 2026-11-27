import type { D1Database } from "@cloudflare/workers-types"
import type { MeterHourRow } from "../core/meter-hours"
import { nextDay } from "../core/rules"

/**
 * Reads every org hourly bucket up to and including `asOf`, one row per plan, hour and model, with
 * each token kind summed apart. `tokens_total` is the raw stored total, so it includes cache reads;
 * a kind no row of the group reported stays null. The meter estimate prices these rows at list
 * prices, and no hour leaves this module.
 */
export async function readMeterHours(db: D1Database, asOf: string): Promise<MeterHourRow[]> {
	const sql = `SELECT usage_hourly.plan AS plan, usage_hourly.hour_utc AS hour_utc,
		 usage_hourly.model AS model,
		 SUM(usage_hourly.tokens_in) AS tokens_in,
		 SUM(usage_hourly.tokens_out) AS tokens_out,
		 SUM(usage_hourly.cache_read) AS cache_read,
		 SUM(usage_hourly.cache_write) AS cache_write,
		 SUM(usage_hourly.tokens_total) AS tokens_total
		 FROM usage_hourly
		 JOIN contributor ON contributor.id = usage_hourly.contributor_id
		 WHERE contributor.kind = 'org' AND usage_hourly.granularity = 'hour'
		   AND usage_hourly.hour_utc < ?
		 GROUP BY usage_hourly.plan, usage_hourly.hour_utc, usage_hourly.model
		 ORDER BY usage_hourly.hour_utc, usage_hourly.plan, usage_hourly.model`
	const result = await db
		.prepare(sql)
		.bind(`${nextDay(asOf)}T00:00:00.000Z`)
		.all<MeterHourRow>()
	return result.results
}
