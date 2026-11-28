import { DATA_AUDIENCE } from "../core/token"
import { WEB_CALLBACK_URL, WEB_CLIENT_ID } from "../core/web-auth"
import type { Env, RequestContext } from "../env"

const TOKEN_TIMEOUT_MS = 5_000

/** The token endpoint's form body: the code, PKCE verifier and the one registered resource. */
function tokenForm(code: string, verifier: string): string {
	return new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: WEB_CALLBACK_URL,
		client_id: WEB_CLIENT_ID,
		code_verifier: verifier,
		resource: DATA_AUDIENCE,
	}).toString()
}

/** Exchanges the code at auth's token endpoint; null on any transport, status or shape failure. */
export async function exchangeCode(
	code: string,
	verifier: string,
	env: Env,
	context: RequestContext,
): Promise<string | null> {
	const authFetch = context.authFetch ?? fetch
	let response: Response
	try {
		response = await authFetch(`${env.AUTH_ISSUER}/api/auth/oauth2/token`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: tokenForm(code, verifier),
			// workerd refuses "error"; "manual" never follows, and the ok check below rejects a 3xx.
			redirect: "manual",
			signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
		})
	} catch (error) {
		// The name only: the code and verifier stay out of the log.
		console.error("data: token exchange failed", error instanceof Error ? error.name : "unknown")
		return null
	}
	if (!response.ok) {
		console.error("data: token exchange answered", response.status)
		return null
	}
	let body: unknown
	try {
		body = await response.json()
	} catch {
		console.error("data: token exchange answered no JSON")
		return null
	}
	const token =
		typeof body === "object" && body !== null
			? (body as { access_token?: unknown }).access_token
			: undefined
	if (typeof token === "string") return token
	console.error("data: token exchange answered no access token")
	return null
}
