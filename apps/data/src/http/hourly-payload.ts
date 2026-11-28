import type { HourlyQuery } from "../core/hourly-query"
import type { HourlyDbRow } from "../db/hourly"

/** One row of the public hourly read; it carries no machine, contributor or model. */
type ApiRow = {
	hourUtc: string
	plan: string
	tokensTotal: number
	requests: number
}

function toApiRow(row: HourlyDbRow): ApiRow {
	return {
		hourUtc: row.hour_utc,
		plan: row.plan,
		tokensTotal: row.tokens_total,
		requests: row.requests,
	}
}

/** The JSON body of a successful hourly read. */
export function hourlyPayload(query: HourlyQuery, rows: HourlyDbRow[]) {
	return {
		asOf: query.asOf,
		methodVersion: 1,
		series: "measured-by-us",
		from: query.from,
		to: query.to,
		rows: rows.map(toApiRow),
	}
}
