import type { D1Database } from "@cloudflare/workers-types"
import type { CacheLike } from "./http/cache"

/** The bindings wrangler.jsonc gives the data Worker. */
export type Env = {
	DB: D1Database
	INGEST_BOOTSTRAP_KEY: string
}

/** Per-request dependencies the Worker injects and tests replace. */
export type RequestContext = {
	nowMs: number
	cache?: CacheLike
}
