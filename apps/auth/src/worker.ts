import { createAuth } from "./auth"
import { authHandlerPath } from "./core/route"
import type { Env } from "./env"

/**
 * The auth Worker. Every Better Auth endpoint lives under `/api/auth`; `/jwks` is the public
 * alias the design promises at the host root. There is no HTML page yet: `/device` and `/sign-in`
 * are the next slice.
 */
export default {
	fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url)
		const path = authHandlerPath(url.pathname)
		if (path === url.pathname) {
			return createAuth({ env }).handler(request)
		}
		const rewritten = new URL(url)
		rewritten.pathname = path
		return createAuth({ env }).handler(new Request(rewritten, request))
	},
}
