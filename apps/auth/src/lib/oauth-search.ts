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
 * Whether a signed flow is too old to continue. A signed query with no expiry is treated as too
 * old, because the provider's own check fails closed on the same query.
 */
export function isExpiredSignedOAuthSearch(search: string, nowMs: number): boolean {
	if (!isSignedOAuthSearch(search)) return false
	const expiresAt = signedOAuthExpiresAtMs(search)
	return expiresAt === null || nowMs >= expiresAt
}
