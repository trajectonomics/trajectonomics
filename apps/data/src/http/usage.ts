import { parseUsageQuery } from "../core/query"
import type { RollupDbRow } from "../db/read"
import { readRollups } from "../db/read"
import type { Env, RequestContext } from "../env"
import { usageCacheKey } from "./cache"
import { json, methodNotAllowed } from "./responses"

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

/** Handles `GET /api/usage`: a cached rollup read with `asOf` and plan/model filters. */
export async function handleUsage(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	if (request.method !== "GET") return methodNotAllowed("GET")
	const parsed = parseUsageQuery(new URL(request.url), context.nowMs, "measured-by-us")
	if (!parsed.ok) return json({ error: "invalid_query", ...parsed.error }, { status: 400 })
	const key = usageCacheKey(request)
	const cache = context.cache
	const cached = cache === undefined ? undefined : await cache.match(key)
	if (cached !== undefined) return cached
	try {
		const rows = await readRollups(env.DB, parsed.query.filter)
		const response = json(
			{
				asOf: parsed.query.asOf,
				methodVersion: 1,
				series: parsed.query.filter.series,
				rows: rows.map(toApiRow),
			},
			{ headers: { "cache-control": "public, max-age=3600, stale-if-error=86400" } },
		)
		if (cache !== undefined) await cache.put(key, response.clone())
		return response
	} catch (error) {
		console.error("data: usage read failed", error)
		const late = cache === undefined ? undefined : await cache.match(key)
		if (late !== undefined) return late
		return json({ error: "storage_error" }, { status: 503 })
	}
}
