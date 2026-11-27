import { parseUsageQuery } from "../core/query"
import { readRollups } from "../db/read"
import type { Env, RequestContext } from "../env"
import { usageCacheKey, usageStaleCacheKey } from "./cache"
import { cachedFresh, cachedInvalid, cachedStale } from "./read-cache"
import { json, methodNotAllowed } from "./responses"
import { usagePayload } from "./usage-payload"

/**
 * Handles `GET /data/api/usage` (and the old host's `/api/usage`): a cached rollup read with
 * `asOf` and plan/model filters.
 */
export async function handleUsage(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	if (request.method !== "GET") return methodNotAllowed("GET")
	const key = usageCacheKey(request)
	const cached = context.cache === undefined ? undefined : await context.cache.match(key)
	if (cached !== undefined) return cached
	const parsed = parseUsageQuery(new URL(request.url), context.nowMs, "measured-by-us")
	if (!parsed.ok) return cachedInvalid(context.cache, key, parsed.error)
	try {
		const rows = await readRollups(env.DB, parsed.query.filter)
		const body = usagePayload(parsed.query.asOf, parsed.query.filter.series, rows)
		return await cachedFresh(context.cache, key, usageStaleCacheKey(request), body)
	} catch (error) {
		console.error("data: usage read failed", error)
		return (
			(await cachedStale(context.cache, usageStaleCacheKey(request))) ??
			json({ error: "storage_error" }, { status: 503 })
		)
	}
}
