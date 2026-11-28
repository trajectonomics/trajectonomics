import { collectorsView } from "../core/collectors"
import { sha256Hex } from "../core/hash"
import { metersView } from "../core/meters"
import { clearCookie, parseCookies, SESSION_COOKIE, SESSION_COOKIE_PATH } from "../core/web-auth"
import { readCollectors } from "../db/web-session"
import type { Env, RequestContext } from "../env"
import { json } from "./responses"

const NO_STORE = { "cache-control": "private, no-store" }

function signedOut(clearSession: boolean): Response {
	const headers = new Headers(NO_STORE)
	if (clearSession) headers.append("set-cookie", clearCookie(SESSION_COOKIE, SESSION_COOKIE_PATH))
	return json({ error: "signed_out" }, { status: 401, headers })
}

/**
 * `GET /data/api/me/collectors`: the signed-in person's machines and usage meters, read through
 * their session and never mixed into a rollup or a public cache (ADR 0015). An absent or expired
 * session is 401.
 */
export async function handleMeCollectors(
	request: Request,
	env: Env,
	context: RequestContext,
): Promise<Response> {
	const sessionId = parseCookies(request.headers.get("cookie")).get(SESSION_COOKIE)
	if (sessionId === undefined) return signedOut(false)
	try {
		const read = await readCollectors(
			env.DB,
			await sha256Hex(sessionId),
			new Date(context.nowMs).toISOString(),
		)
		if (!read.signedIn) return signedOut(true)
		return json(
			{
				collectors: collectorsView(read.rows),
				meters: metersView(read.readings, read.recentPlans, context.nowMs),
			},
			{ headers: NO_STORE },
		)
	} catch (error) {
		console.error("data: collectors read failed", error)
		return json({ error: "storage_error" }, { status: 503, headers: NO_STORE })
	}
}
