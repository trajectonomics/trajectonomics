import { healthReport } from "../core/health"
import { readCollectingDays, readLastIngest } from "../db/read"
import type { Env, RequestContext } from "../env"
import { healthCacheKey } from "./cache"
import { json, methodNotAllowed } from "./responses"

/**
 * Handles `GET /data/api/health` (and the old host's `/api/health`): the last ingest time, whether
 * it is stale, and the UTC days collection covers.
 */
export async function handleHealth(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	if (request.method !== "GET") return methodNotAllowed("GET")
	const key = healthCacheKey(request)
	const cached = context.cache === undefined ? undefined : await context.cache.match(key)
	if (cached !== undefined) return cached
	try {
		const [lastIngestAt, collected] = await Promise.all([
			readLastIngest(env.DB),
			readCollectingDays(env.DB),
		])
		const response = json(healthReport(lastIngestAt, context.nowMs, collected), {
			headers: { "cache-control": "public, max-age=60" },
		})
		if (context.cache !== undefined) await context.cache.put(key, response.clone())
		return response
	} catch (error) {
		console.error("data: health read failed", error)
		return json({ error: "storage_error" }, { status: 503 })
	}
}
