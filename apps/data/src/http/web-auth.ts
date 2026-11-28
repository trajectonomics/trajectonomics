import { sha256Hex } from "../core/hash"
import { BASE_PATH, ME_PATH, SITE_ORIGIN } from "../core/urls"
import {
	AUTH_COOKIE_PATH,
	authorizeUrl,
	base64url,
	clearCookie,
	OAUTH_COOKIE,
	OAUTH_TTL_SECONDS,
	parseCookies,
	SESSION_COOKIE,
	setCookie,
} from "../core/web-auth"
import { deleteWebSession } from "../db/web-session"
import type { Env, RequestContext } from "../env"
import { json } from "./responses"

const DEFAULT_RANDOM = (length: number): Uint8Array =>
	crypto.getRandomValues(new Uint8Array(length))

/** The injected random bytes, or Web Crypto's when the context does not carry one. */
export function randomBytes(context: RequestContext, length: number): Uint8Array {
	return (context.random ?? DEFAULT_RANDOM)(length)
}

/** The 303 every callback answer uses, clearing the OAuth cookie on the way out. */
export function callbackFailed(): Response {
	return redirectWithCookies(`${ME_PATH}?signin=failed`, [
		clearCookie(OAUTH_COOKIE, AUTH_COOKIE_PATH),
	])
}

/** A 303 that carries one Set-Cookie header per entry, and a body no cache may keep. */
export function redirectWithCookies(location: string, cookies: readonly string[]): Response {
	const headers = new Headers({ location, "cache-control": "no-store" })
	for (const cookie of cookies) headers.append("set-cookie", cookie)
	return new Response(null, { status: 303, headers })
}

/** Starts the web client's PKCE flow: state and verifier in a short HttpOnly cookie (ADR 0015). */
export async function handleSignIn(
	_request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	const state = base64url(randomBytes(context, 32))
	const verifier = base64url(randomBytes(context, 32))
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
	const challenge = base64url(new Uint8Array(digest))
	const headers = new Headers({
		location: authorizeUrl(env.AUTH_ISSUER, { state, challenge }),
		"cache-control": "no-store",
	})
	headers.append(
		"set-cookie",
		setCookie(OAUTH_COOKIE, `${state}.${verifier}`, {
			path: AUTH_COOKIE_PATH,
			maxAge: OAUTH_TTL_SECONDS,
		}),
	)
	return new Response(null, { status: 302, headers })
}

/**
 * Ends the browser session. A POST from another origin is refused, so a page elsewhere cannot
 * sign the person out; a session cookie that is present is removed from D1 by its hash.
 */
export async function handleSignOut(
	request: Request,
	env: Env,
	_context: RequestContext,
): Promise<Response> {
	if (request.headers.get("origin") !== SITE_ORIGIN) {
		return json({ error: "forbidden" }, { status: 403 })
	}
	const sessionId = parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE)
	if (sessionId !== undefined) {
		try {
			await deleteWebSession(env.DB, await sha256Hex(sessionId))
		} catch (error) {
			// The row may still exist, so the person is not told they signed out.
			console.error("data: web session delete failed", error)
			return json({ error: "unavailable" }, { status: 503 })
		}
	}
	return redirectWithCookies(`${BASE_PATH}/`, [clearCookie(SESSION_COOKIE, BASE_PATH)])
}
