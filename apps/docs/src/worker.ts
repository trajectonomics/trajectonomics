import { type AssetsBinding, handleRequest } from "./lib/worker/handler"

/** The bindings `wrangler.jsonc` gives the Portal's Worker. */
interface Env {
	readonly ASSETS: AssetsBinding
}

// The assets Worker gains an entry module to redirect the old `/docs` mount and to answer
// `Accept: text/markdown` (ADR 0010, ADR 0013). `run_worker_first` sends it every path, and it
// forwards the rest.
export default {
	fetch(request: Request, env: Env): Promise<Response> {
		return handleRequest(request, env.ASSETS)
	},
}
