import { sha256Hex } from "../core/hash"
import { ME_PATH } from "../core/urls"
import {
	AUTH_COOKIE_PATH,
	base64url,
	clearCookie,
	equalConstantTime,
	OAUTH_COOKIE,
	parseCookies,
	parseOauthCookie,
	SESSION_COOKIE,
	SESSION_COOKIE_PATH,
	SESSION_TTL_SECONDS,
	setCookie,
} from "../core/web-auth"
import { createWebSession } from "../db/web-session"
import type { Env, RequestContext } from "../env"
import { verifyWithKeys } from "./auth"
import { exchangeCode } from "./token-exchange"
import { callbackFailed, randomBytes, redirectWithCookies } from "./web-auth"

/** The callback's success: a new random session id, stored only as its hash (ADR 0015). */
async function startSession(
	authUserId: string,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	const sessionId = base64url(randomBytes(context, 32))
	const nowIso = new Date(context.nowMs).toISOString()
	const expiresAt = new Date(context.nowMs + SESSION_TTL_SECONDS * 1000).toISOString()
	try {
		const session = {
			hash: await sha256Hex(sessionId),
			authUserId,
			authUserHash: await sha256Hex(authUserId),
		}
		if (!(await createWebSession(env.DB, session, nowIso, expiresAt))) return callbackFailed()
	} catch (error) {
		console.error("data: web session write failed", error)
		return callbackFailed()
	}
	return redirectWithCookies(ME_PATH, [
		clearCookie(OAUTH_COOKIE, AUTH_COOKIE_PATH),
		setCookie(SESSION_COOKIE, sessionId, {
			path: SESSION_COOKIE_PATH,
			maxAge: SESSION_TTL_SECONDS,
		}),
	])
}

/**
 * Finishes the PKCE flow: check state, exchange the code, verify the access token with no scope
 * requirement, then discard the tokens and keep only this Worker's own hashed session (ADR 0015).
 */
export async function handleAuthCallback(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	const cookie = parseCookies(request.headers.get("cookie")).get(OAUTH_COOKIE) ?? null
	const oauth = parseOauthCookie(cookie)
	if (oauth === null) return callbackFailed()
	const url = new URL(request.url)
	const state = url.searchParams.get("state")
	if (state === null || !equalConstantTime(state, oauth.state)) return callbackFailed()
	if (url.searchParams.has("error")) return callbackFailed()
	const code = url.searchParams.get("code")
	if (code === null || code.length === 0) return callbackFailed()
	const token = await exchangeCode(code, oauth.verifier, env, context)
	if (token === null) return callbackFailed()
	let sub: string
	try {
		const check = await verifyWithKeys(token, env, context, null)
		if (!check.ok) return callbackFailed()
		sub = check.sub
	} catch {
		return callbackFailed()
	}
	return startSession(sub, env, context)
}
