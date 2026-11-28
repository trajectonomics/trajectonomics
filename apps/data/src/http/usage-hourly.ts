import { parseHourlyQuery } from "../core/hourly-query"
import { readHourly } from "../db/hourly"
import type { Env, RequestContext } from "../env"
import { hourlyCacheKey, hourlyStaleCacheKey } from "./cache"
import { hourlyPayload } from "./hourly-payload"
import { cachedFresh, cachedInvalid, cachedStale } from "./read-cache"
import { json, methodNotAllowed } from "./responses"

/**
 * Handles `GET /data/api/usage/hourly` (and the old host's `/api/usage/hourly`): the org's tokens
 * per plan and UTC hour for a week at most, cached like `/api/usage`.
 */
export async function handleUsageHourly(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	if (request.method !== "GET") return methodNotAllowed("GET")
	const key = hourlyCacheKey(request)
	const cached = context.cache === undefined ? undefined : await context.cache.match(key)
	if (cached !== undefined) return cached
	const parsed = parseHourlyQuery(new URL(request.url), context.nowMs)
	if (!parsed.ok) return cachedInvalid(context.cache, key, parsed.error)
	try {
		const rows = await readHourly(env.DB, parsed.query.from, parsed.query.to)
		const body = hourlyPayload(parsed.query, rows)
		return await cachedFresh(context.cache, key, hourlyStaleCacheKey(request), body)
	} catch (error) {
		console.error("data: hourly read failed", error)
		return (
			(await cachedStale(context.cache, hourlyStaleCacheKey(request))) ??
			json({ error: "storage_error" }, { status: 503 })
		)
	}
}
