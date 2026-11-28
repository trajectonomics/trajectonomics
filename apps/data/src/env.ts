import type { D1Database } from "@cloudflare/workers-types"
import type { CacheLike } from "./http/cache"
import type { JwksSource } from "./http/jwks"

/** The bindings wrangler.jsonc gives the data Worker. */
export type Env = {
	DB: D1Database
	AUTH_ISSUER: string
	/** The owner's auth user id, which binds the org row once (ADR 0015). */
	ORG_AUTH_USER_ID?: string
	/** Transitional until the shared key is retired (ADR 0015). */
	INGEST_BOOTSTRAP_KEY?: string
}

/** Per-request dependencies the Worker injects and tests replace. */
export type RequestContext = {
	nowMs: number
	cache?: CacheLike
	jwks?: JwksSource
	/** Random bytes for the OAuth state, PKCE verifier and session id; tests inject a fixed one. */
	random?: (length: number) => Uint8Array
	/** The fetch the token exchange uses; tests inject a fake auth endpoint. */
	authFetch?: typeof fetch
}
