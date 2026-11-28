import { errorMessage } from "../message"
import { DATA_AUDIENCE } from "./config"
import type { Credentials } from "./credentials"
import { type AuthFetch, type AuthResponse, oauthErrorCode, postForm, responseBody } from "./http"
import { parseTokenResponse, type TokenSet } from "./tokens"

/** What one refresh attempt means: new tokens, a dead grant, or a failure worth retrying. */
export type RefreshOutcome =
	| { kind: "tokens"; tokens: TokenSet }
	| { kind: "expired" }
	| { kind: "retry"; message: string }

function parseTokens(body: unknown): TokenSet | null {
	try {
		return parseTokenResponse(body)
	} catch {
		return null
	}
}

/**
 * Posts one refresh grant. Only a lost response, a timeout, a 5xx or a 2xx body that does not
 * parse is retryable; `invalid_grant` and every other 4xx mean the grant is gone.
 */
export async function refreshOnce(
	credentials: Credentials,
	fetchFn: AuthFetch,
): Promise<RefreshOutcome> {
	let response: AuthResponse
	try {
		response = await postForm(fetchFn, `${credentials.issuer}/api/auth/oauth2/token`, {
			grant_type: "refresh_token",
			refresh_token: credentials.refreshToken,
			client_id: credentials.clientId,
			resource: DATA_AUDIENCE,
		})
	} catch (error) {
		return { kind: "retry", message: `token refresh failed: ${errorMessage(error)}` }
	}
	const body = await responseBody(response)
	if (oauthErrorCode(body) === "invalid_grant") return { kind: "expired" }
	if (response.ok) {
		const tokens = parseTokens(body)
		if (tokens === null) {
			return { kind: "retry", message: "token refresh failed: malformed token response" }
		}
		return { kind: "tokens", tokens }
	}
	const message = `token refresh failed: HTTP ${response.status}`
	if (response.status >= 500) return { kind: "retry", message }
	throw new Error(message)
}
