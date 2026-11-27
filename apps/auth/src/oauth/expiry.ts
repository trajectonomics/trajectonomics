/**
 * Expiring a grant's approval record.
 *
 * The check runs on every path that can issue an authorization code: a GET to
 * `/oauth2/authorize`, the internal re-dispatch of authorize after a sign-in, and
 * `/oauth2/continue`. It reads only the signed-in user's consent for that client. An anonymous
 * request has no grant to expire and must never scan the client's other users.
 */
import { getSessionFromCtx } from "better-auth/api"
import { grantLifetimeRejection } from "../core/resource-request"
import { deleteConsentRow, deleteTokenFamily, snapshotTokenFamily } from "./family"
import { hookNow, type OAuthHookOptions } from "./request"
import { findConsents, type StoredConsent } from "./store"
import { asDate } from "./values"
import { deletePendingAuthorizationCodes } from "./verification-sql"

/** True when the consent is past the grant's absolute lifetime, or has no readable approval. */
export function consentExpired(
	ctx: { context: unknown; headers?: Headers | undefined },
	consent: StoredConsent,
	options: OAuthHookOptions,
): boolean {
	return (
		grantLifetimeRejection({
			approvedAt: asDate(consent.createdAt),
			now: hookNow(ctx, options),
			lifetimeSeconds: options.absoluteLifetimeSeconds,
		}) !== null
	)
}

/**
 * Deletes the signed-in user's expired consent for a client, with its token family and pending
 * authorization codes, before the authorization-code flow can reuse it. 1.7.28's
 * `/oauth2/consent` updates a found consent in place and keeps its old `createdAt`; without this
 * pass, signing in again after ninety days updates the expired row and the first refresh still
 * fails. A live consent is left alone, and a dead duplicate is removed without touching the live
 * grant's tokens.
 */
export async function expireConsentForSession(
	ctx: { context: unknown; headers?: Headers | undefined },
	clientId: string,
	options: OAuthHookOptions,
): Promise<void> {
	await expireSignedInConsent(ctx, clientId, options, false)
}

/**
 * The `/oauth2/consent` preparation: the same expiry as above, plus the leftover token family
 * when no consent exists at all. The library is about to create a fresh approval; a token from
 * the previous one must not attach to it.
 */
export async function prepareConsentForApproval(
	ctx: { context: unknown; headers?: Headers | undefined },
	clientId: string,
	options: OAuthHookOptions,
): Promise<void> {
	await expireSignedInConsent(ctx, clientId, options, true)
}

async function expireSignedInConsent(
	ctx: { context: unknown; headers?: Headers | undefined },
	clientId: string,
	options: OAuthHookOptions,
	cleanupWhenAbsent: boolean,
): Promise<void> {
	const session = await getSessionFromCtx(ctx as Parameters<typeof getSessionFromCtx>[0])
	const userId = session?.user?.id
	if (typeof userId !== "string" || userId === "") return
	const owner = { clientId, userId }
	// The family as it stood before the read, so a token another approval mints afterwards survives.
	const family = await snapshotTokenFamily(ctx, owner)
	const rows = await findConsents(ctx, clientId, userId)
	const live = rows.filter((consent) => !consentExpired(ctx, consent, options))
	for (const consent of rows) {
		if (live.includes(consent)) continue
		// A live approval is the grant; dead duplicate rows go without touching its token family.
		await deleteConsentRow(ctx, consent.id)
	}
	if (live.length > 0) return
	if (rows.length === 0 && !cleanupWhenAbsent) return
	await deleteTokenFamily(ctx, family)
	await deletePendingAuthorizationCodes(options.database, owner)
}
