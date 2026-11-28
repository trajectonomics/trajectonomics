/** The auth Worker's default issuer; `TRAJ_AUTH_URL` overrides it. */
export const DEFAULT_AUTH_ISSUER = "https://auth.trajectonomics.com"

/** The public OAuth client the collector signs in with. */
export const COLLECTOR_CLIENT_ID = "traj-data-collector"

/** The one RFC 8707 resource the collector's grant is bound to. */
export const DATA_AUDIENCE = "https://trajectonomics.com/data"

/** The scopes one device grant asks for. */
export const COLLECTOR_SCOPE = "openid offline_access data:ingest"

/** Auth's absolute grant limit, counted from the original approval. */
export const GRANT_LIMIT_DAYS = 90

/** Drops trailing slashes so endpoint paths join cleanly. */
export function trimIssuer(issuer: string): string {
	return issuer.replace(/\/+$/, "")
}

/** The issuer to talk to, from `TRAJ_AUTH_URL` or the default, without a trailing slash. */
export function authIssuer(env: Record<string, string | undefined>): string {
	const configured = env["TRAJ_AUTH_URL"]
	return trimIssuer(
		configured === undefined || configured.length === 0 ? DEFAULT_AUTH_ISSUER : configured,
	)
}
