import type { D1Database } from "@cloudflare/workers-types"

/**
 * The bindings and vars `wrangler.jsonc` gives the auth Worker. The four OAuth secrets and the
 * Better Auth secret are Worker secrets, never `vars`.
 */
export type Env = {
	DB: D1Database
	BETTER_AUTH_SECRET: string
	BETTER_AUTH_URL: string
	ENVIRONMENT?: string
	DEV_ONLY?: string
	GOOGLE_CLIENT_ID?: string
	GOOGLE_CLIENT_SECRET?: string
	GITHUB_CLIENT_ID?: string
	GITHUB_CLIENT_SECRET?: string
	PASSKEY_RP_ID?: string
	PASSKEY_ORIGIN?: string
}

/** The cookie and bearer inputs the Worker reads, injected so a test can replace them. */
export type RequestInput = {
	request: Request
	env: Env
}
