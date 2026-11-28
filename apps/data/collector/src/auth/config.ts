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

/** Hosts allowed to speak plain HTTP, so a local auth Worker can be tested. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

/** Drops trailing slashes so endpoint paths join cleanly. */
export function trimIssuer(issuer: string): string {
	return issuer.replace(/\/+$/, "")
}

/** Refuses an issuer that would carry a device grant or a refresh token over plain HTTP. */
export function requireSecureIssuer(issuer: string): string {
	let url: URL
	try {
		url = new URL(issuer)
	} catch {
		throw new Error(`issuer is not a URL: ${issuer}`)
	}
	if (url.protocol === "https:") return issuer
	if (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname)) return issuer
	throw new Error(
		`issuer must use https; http is allowed only on localhost, 127.0.0.1 or [::1]: ${issuer}`,
	)
}

/** The issuer to talk to, from `TRAJ_AUTH_URL` or the default, without a trailing slash. */
export function authIssuer(env: Record<string, string | undefined>): string {
	const configured = env["TRAJ_AUTH_URL"]
	return requireSecureIssuer(
		trimIssuer(
			configured === undefined || configured.length === 0 ? DEFAULT_AUTH_ISSUER : configured,
		),
	)
}
