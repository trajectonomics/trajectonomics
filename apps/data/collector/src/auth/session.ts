import type { Credentials } from "./credentials"
import type { AuthFetch } from "./http"
import { type RefreshOutcome, refreshOnce } from "./refresh"

/** The grant can no longer be refreshed; only a new sign-in helps. */
export class SignInExpiredError extends Error {
	constructor() {
		super("sign-in expired or was revoked; run the collector's login command again")
		this.name = "SignInExpiredError"
	}
}

/** Network, clock, persistence and wait hooks; the save happens before the token is used. */
export type SessionDeps = {
	fetch: AuthFetch
	nowIso: () => string
	save: (credentials: Credentials) => void | Promise<void>
	sleep: (milliseconds: number) => Promise<void>
}

/** Refresh attempts in total; auth keeps a rotated refresh token usable for 60 seconds. */
export const REFRESH_ATTEMPTS = 3

/** Wait between attempts, so all three stay inside auth's 60-second reuse window. */
export const REFRESH_RETRY_MS = 2_000

/**
 * Refreshes once and returns a 15-minute access token. The current file is rewritten first, so a
 * stale copy is not lost when the disk is full, and the rotated refresh token is saved before the
 * access token leaves this function.
 */
export async function accessToken(credentials: Credentials, deps: SessionDeps): Promise<string> {
	await deps.save(credentials)
	for (let attempt = 1; attempt <= REFRESH_ATTEMPTS; attempt += 1) {
		const outcome: RefreshOutcome = await refreshOnce(credentials, deps.fetch)
		if (outcome.kind === "expired") throw new SignInExpiredError()
		if (outcome.kind === "tokens") {
			await deps.save({
				...credentials,
				refreshToken: outcome.tokens.refreshToken,
				refreshedAt: deps.nowIso(),
			})
			return outcome.tokens.accessToken
		}
		if (attempt === REFRESH_ATTEMPTS) throw new Error(outcome.message)
		await deps.sleep(REFRESH_RETRY_MS)
	}
	throw new Error("token refresh failed: no attempts made")
}
