import type { D1Database, Fetcher } from "@cloudflare/workers-types"

/**
 * The bindings and vars `wrangler.jsonc` gives the auth Worker. The four OAuth secrets and the
 * Better Auth secret are Worker secrets, never `vars`. `DATA` is optional: a local Worker or a
 * self-hosted deployment without the data service still deletes the account and queues the call.
 */
export type Env = {
	DB: D1Database
	DATA?: Fetcher
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
