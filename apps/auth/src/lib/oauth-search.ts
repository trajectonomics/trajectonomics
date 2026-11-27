/** Whether a query string is an OAuth provider flow the page must carry through sign-in. */
export function isSignedOAuthSearch(search: string): boolean {
	const params = new URLSearchParams(search)
	return params.has("sig") && params.has("client_id")
}

/**
 * When the provider's signed query stops being accepted, in milliseconds, or null when the search
 * carries no readable expiry. The provider signs the query for ten minutes and includes `exp` in
 * seconds inside the signature, so the page can tell an expired flow apart before it posts.
 */
export function signedOAuthExpiresAtMs(search: string): number | null {
	const raw = new URLSearchParams(search).get("exp")
	if (raw === null || raw.trim() === "") return null
	const seconds = Number(raw)
	if (!Number.isFinite(seconds) || seconds <= 0) return null
	return seconds * 1_000
}

/**
 * Whether a signed flow is too old to continue, judged by the server's clock.
 *
 * `nowMs` comes from the `Date` header of the page's get-session answer. When that header is
 * missing or unreadable the page cannot judge the expiry, so it treats the query as alive and lets
 * the provider's server decide; a device clock 15 minutes fast must not block a valid sign-in. A
 * signed query with no `exp` is treated as too old, because the provider's own check fails closed.
 */
export function isExpiredSignedOAuthSearch(search: string, nowMs: number | null): boolean {
	if (!isSignedOAuthSearch(search)) return false
	if (nowMs === null || !Number.isFinite(nowMs)) return false
	const expiresAt = signedOAuthExpiresAtMs(search)
	return expiresAt === null || nowMs >= expiresAt
}
