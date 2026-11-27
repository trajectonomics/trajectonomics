/**
 * Whether the dev-only email + password sign-in may be enabled. This is the only sign-in path a
 * test user gets; every real user signs in with Google, GitHub or a passkey.
 *
 * The answer is yes only when all three hold:
 * - the deployment says `ENVIRONMENT=development`; the committed `wrangler.jsonc` says `production`;
 * - `DEV_ONLY=true`, which exists only in an untracked `.dev.vars`;
 * - the base URL is a loopback address, so a deployed Worker cannot satisfy it.
 *
 * A production deployment therefore cannot enable the path even if someone adds `DEV_ONLY` as a
 * secret: the committed `ENVIRONMENT` is `production`, and `auth.trajectonomics.com` is not
 * loopback.
 */
export function devSignInAllowed(input: {
	environment: string | undefined
	devOnly: string | undefined
	baseUrl: string | undefined
}): boolean {
	if (input.environment !== "development") return false
	if (input.devOnly !== "true") return false
	if (input.baseUrl === undefined) return false
	return isLoopbackUrl(input.baseUrl)
}

/** True for `http://localhost`, `http://127.0.0.1` and `http://[::1]`, on any path and port. */
export function isLoopbackUrl(value: string): boolean {
	let url: URL
	try {
		url = new URL(value)
	} catch {
		return false
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return false
	const host = url.hostname.toLowerCase()
	return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1"
}
