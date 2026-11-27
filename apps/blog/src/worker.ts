import { oldHostRedirect } from "./lib/redirect"

/** The Assets binding wrangler serves `./dist` through, under the blog's `/blog/` base. */
interface Env {
	readonly ASSETS: { fetch(request: Request): Promise<Response> }
}

/**
 * The blog Worker. Assets under `/blog/` answer without running this script. A request that reaches
 * it is outside that base or is a miss inside it: the old host gets the redirect, and a miss is
 * forwarded to the assets so the Not-found Page answers.
 */
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return oldHostRedirect(request) ?? env.ASSETS.fetch(request)
	},
}
