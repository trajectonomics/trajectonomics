import { healthReport } from "./core/health"
import { readLastIngest } from "./db/read"
import type { Env } from "./env"
import type { CacheLike } from "./http/cache"
import { handleRequest } from "./http/router"

function cache(): CacheLike {
	return caches.default as unknown as CacheLike
}

export default {
	fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env, { nowMs: Date.now(), cache: cache() })
	},
	async scheduled(_controller: { cron: string }, env: Env): Promise<void> {
		const lastIngestAt = await readLastIngest(env.DB)
		const health = healthReport(lastIngestAt, Date.now())
		if (health.stale) {
			console.warn(`data: no ingest for ${health.minutesSinceIngest ?? "unknown"} minutes`)
		}
	},
}
