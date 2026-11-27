import { createAuth } from "./auth"
import { authHandlerPath } from "./core/route"
import { withSecurityHeaders } from "./core/security-headers"
import type { Env } from "./env"
import { retryPendingDeletions } from "./pending-deletion-retry"

/**
 * The auth Worker. Better Auth answers `/api/auth/*`, `/jwks` and `/.well-known/*` first; every
 * other path is a static page from `dist-site`, served by the assets binding. The hourly cron
 * retries the data Worker's deletion notices that did not get through and purges the old ones.
 *
 * Static pages get their headers from `dist-site/_headers`; the Worker's own answers carry the same
 * frame and type rules here, because an API answer or a redirect must not be framed either.
 */
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url)
		const path = authHandlerPath(url.pathname)
		if (path === url.pathname) {
			return withSecurityHeaders(await createAuth({ env }).handler(request))
		}
		const rewritten = new URL(url)
		rewritten.pathname = path
		return withSecurityHeaders(await createAuth({ env }).handler(new Request(rewritten, request)))
	},
	async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
		await retryPendingDeletions({ db: env.DB, data: env.DATA, nowMs: Date.now() })
	},
} satisfies ExportedHandler<Env>
