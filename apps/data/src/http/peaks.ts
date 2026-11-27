import { parsePeaksQuery } from "../core/peaks-query"
import { readPeaks } from "../db/read"
import type { Env, RequestContext } from "../env"
import { peaksCacheKey, peaksStaleCacheKey } from "./cache"
import { peaksPayload } from "./peaks-payload"
import { cachedFresh, cachedInvalid, cachedStale } from "./read-cache"
import { json, methodNotAllowed } from "./responses"

/**
 * Handles `GET /data/api/peaks` (and the old host's `/api/peaks`): the most tokens each plan used
 * in any 5 hours, 7 days and 30 days, with an optional `asOf` day. Cached like `/api/usage`.
 */
export async function handlePeaks(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	if (request.method !== "GET") return methodNotAllowed("GET")
	const key = peaksCacheKey(request)
	const cached = context.cache === undefined ? undefined : await context.cache.match(key)
	if (cached !== undefined) return cached
	const parsed = parsePeaksQuery(new URL(request.url), context.nowMs)
	if (!parsed.ok) return cachedInvalid(context.cache, key, parsed.error)
	try {
		const rows = await readPeaks(env.DB, parsed.query.asOf)
		return await cachedFresh(
			context.cache,
			key,
			peaksStaleCacheKey(request),
			peaksPayload(parsed.query.asOf, rows),
		)
	} catch (error) {
		console.error("data: peaks read failed", error)
		return (
			(await cachedStale(context.cache, peaksStaleCacheKey(request))) ??
			json({ error: "storage_error" }, { status: 503 })
		)
	}
}
