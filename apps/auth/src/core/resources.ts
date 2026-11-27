/**
 * The OAuth resources the auth platform issues tokens for, and the scopes each one may carry.
 *
 * A resource is an absolute URI (RFC 8707). A token is issued for exactly one resource, so its
 * `aud` names one server and that server can reject a token minted for another. `allowedScopes`
 * is the per-resource allowlist: `data:ingest` exists only on the data audience, so it can never
 * be issued for the relay.
 *
 * This module is pure: no I/O, no clock, no environment. `src/auth.ts` turns it into plugin
 * options, and `scripts/generate-clients.ts` turns it into the committed migration.
 */

/** The data site's real home since data ADR 0006. */
export const DATA_AUDIENCE = "https://trajectonomics.com/data"
/** The relay's audience. */
export const RELAY_AUDIENCE = "https://relay.trajectonomics.com"

/** The access JWT lifetime: fifteen minutes. */
export const ACCESS_TOKEN_TTL_SECONDS = 900
/** A refresh token's own lifetime: thirty days. Rotation issues a new one. */
export const REFRESH_TOKEN_TTL_SECONDS = 2_592_000
/** A grant's absolute lifetime from its original approval: ninety days. Rotation cannot extend it. */
export const REFRESH_TOKEN_ABSOLUTE_TTL_SECONDS = 7_776_000
/**
 * How long a rotated refresh token can be replayed to receive the same token response. A lost
 * response is retried inside this window; outside it, a replay revokes the family.
 */
export const REFRESH_TOKEN_REUSE_INTERVAL_SECONDS = 60

export const OAUTH_SCOPES = ["openid", "profile", "email", "offline_access", "data:ingest"] as const
export type OAuthScope = (typeof OAUTH_SCOPES)[number]

export type OAuthResourceDefinition = {
	/** The RFC 8707 identifier, which is also the row's `identifier`. */
	identifier: string
	name: string
	accessTokenTtl: number
	allowedScopes: readonly OAuthScope[]
}

export const OAUTH_RESOURCES: readonly OAuthResourceDefinition[] = [
	{
		identifier: DATA_AUDIENCE,
		name: "Trajectonomics data",
		accessTokenTtl: ACCESS_TOKEN_TTL_SECONDS,
		allowedScopes: ["openid", "profile", "email", "offline_access", "data:ingest"],
	},
	{
		identifier: RELAY_AUDIENCE,
		name: "Trajectonomics relay",
		accessTokenTtl: ACCESS_TOKEN_TTL_SECONDS,
		allowedScopes: ["openid", "profile", "email", "offline_access"],
	},
]
