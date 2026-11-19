import type { Assets } from "./handle-request"
import { handleRequest } from "./handle-request"

/** The bindings this Worker declares: `ASSETS` is the built Site that wrangler serves. */
export interface Env {
	readonly ASSETS: Assets
}

/** The Site's Worker: its only script is the redirect from `/` ([ADR 0003]). */
export default {
	fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env.ASSETS)
	},
}
