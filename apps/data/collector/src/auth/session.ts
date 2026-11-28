import { DATA_AUDIENCE } from "./config"
import type { Credentials } from "./credentials"
import { type AuthFetch, oauthErrorCode, postForm, responseBody } from "./http"
import { parseTokenResponse, type TokenSet } from "./tokens"

/** The grant can no longer be refreshed; only a new sign-in helps. */
export class SignInExpiredError extends Error {
	constructor() {
		super("sign-in expired or was revoked; run: bun src/cli.ts login")
		this.name = "SignInExpiredError"
	}
}

/** Network, clock and persistence hooks; the save happens before the token is used. */
export type SessionDeps = {
	fetch: AuthFetch
	nowIso: () => string
	save: (credentials: Credentials) => void | Promise<void>
}

function parseTokens(body: unknown): TokenSet | null {
	try {
		return parseTokenResponse(body)
	} catch {
		return null
	}
}

/**
 * Refreshes once and returns a 15-minute access token. The rotated refresh token is saved before
 * the access token leaves this function, so a crash cannot lose the only live refresh token.
 */
export async function accessToken(credentials: Credentials, deps: SessionDeps): Promise<string> {
	const response = await postForm(deps.fetch, `${credentials.issuer}/api/auth/oauth2/token`, {
		grant_type: "refresh_token",
		refresh_token: credentials.refreshToken,
		client_id: credentials.clientId,
		resource: DATA_AUDIENCE,
	})
	const body = await responseBody(response)
	if (oauthErrorCode(body) === "invalid_grant") throw new SignInExpiredError()
	const tokens = response.ok ? parseTokens(body) : null
	if (tokens === null) throw new Error(`token refresh failed: HTTP ${response.status}`)
	await deps.save({
		...credentials,
		refreshToken: tokens.refreshToken,
		refreshedAt: deps.nowIso(),
	})
	return tokens.accessToken
}
