import { GRANT_LIMIT_DAYS } from "./config"
import type { Credentials } from "./credentials"

const DAY_MS = 86_400_000

/**
 * The original approval date to keep. Auth counts its 90-day limit from the consent's creation, so
 * a re-login for the same issuer and account inside a live grant keeps the old date; every other
 * sign-in starts a new one.
 */
export function grantStartedAt(
	issuer: string,
	accountId: string | null,
	nowIso: string,
	read: () => Credentials | null,
): string {
	let existing: Credentials | null
	try {
		existing = read()
	} catch {
		return nowIso
	}
	if (existing === null || existing.issuer !== issuer || existing.accountId !== accountId) {
		return nowIso
	}
	const ageMs = Date.parse(nowIso) - Date.parse(existing.grantStartedAt)
	return ageMs < GRANT_LIMIT_DAYS * DAY_MS ? existing.grantStartedAt : nowIso
}
