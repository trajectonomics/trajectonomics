import { DATA_AUDIENCE } from "./token"
import { BASE_PATH, SITE_ORIGIN } from "./urls"

/** The browser's session cookie on the data site; its value is a random session id. */
export const SESSION_COOKIE = "traj_data_session"

/** The short-lived cookie that carries the OAuth state and PKCE verifier. */
export const OAUTH_COOKIE = "traj_data_oauth"

/** How long a web session lasts, in seconds: eight hours. */
export const SESSION_TTL_SECONDS = 28_800

/** How long the authorization request may take, in seconds: ten minutes. */
export const OAUTH_TTL_SECONDS = 600

/** The seeded auth client for the data site's browser flow. */
export const WEB_CLIENT_ID = "traj-data-web"

/** The one redirect URI auth has registered for the web client. */
export const WEB_CALLBACK_URL = `${SITE_ORIGIN}${BASE_PATH}/auth/callback`

/** The path the OAuth cookie is scoped to. */
export const AUTH_COOKIE_PATH = `${BASE_PATH}/auth`

/** The path the session cookie is scoped to. */
export const SESSION_COOKIE_PATH = BASE_PATH

/** A byte array as unpadded base64url, the form OAuth's state and verifier take. */
export function base64url(bytes: Uint8Array): string {
	let binary = ""
	for (const byte of bytes) binary += String.fromCharCode(byte)
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}

/** The authorization URL for the web client's PKCE code flow (ADR 0015). */
export function authorizeUrl(
	issuer: string,
	{ state, challenge }: { state: string; challenge: string },
): string {
	const url = new URL(`${issuer}/api/auth/oauth2/authorize`)
	url.search = new URLSearchParams({
		client_id: WEB_CLIENT_ID,
		redirect_uri: WEB_CALLBACK_URL,
		response_type: "code",
		scope: "openid",
		code_challenge: challenge,
		code_challenge_method: "S256",
		state,
		resource: DATA_AUDIENCE,
	}).toString()
	return url.href
}

/**
 * Reads a Cookie header into its pairs. Whitespace around a pair or its name is tolerated, a pair
 * with no `=` is skipped, and the first value wins when a name repeats.
 */
export function parseCookies(header: string | null): Map<string, string> {
	const cookies = new Map<string, string>()
	if (header === null) return cookies
	for (const part of header.split(";")) {
		const index = part.indexOf("=")
		if (index < 0) continue
		const name = part.slice(0, index).trim()
		if (name.length === 0 || cookies.has(name)) continue
		cookies.set(name, part.slice(index + 1).trim())
	}
	return cookies
}

/** A Set-Cookie value for a browser cookie on the data site. */
export function setCookie(
	name: string,
	value: string,
	{ path, maxAge }: { path: string; maxAge: number },
): string {
	return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
}

/** A Set-Cookie value that removes a cookie at the given path. */
export function clearCookie(name: string, path: string): string {
	return setCookie(name, "", { path, maxAge: 0 })
}

/** The OAuth cookie's two 32-byte base64url parts, or null when the value is not exactly that. */
export function parseOauthCookie(value: string | null): { state: string; verifier: string } | null {
	if (value === null) return null
	const parts = value.split(".")
	if (parts.length !== 2) return null
	const [state, verifier] = parts
	if (state === undefined || verifier === undefined) return null
	if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(verifier)) return null
	return { state, verifier }
}

/** Compares two strings without exiting at the first differing character; only length exits early. */
export function equalConstantTime(left: string, right: string): boolean {
	if (left.length !== right.length) return false
	let diff = 0
	for (let index = 0; index < left.length; index += 1) {
		diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
	}
	return diff === 0
}
