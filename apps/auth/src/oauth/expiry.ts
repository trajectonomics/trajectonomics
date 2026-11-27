/** Expiring a grant's approval record, for the consent after-hook and the authorize before-hook. */
import { grantLifetimeRejection } from "../core/resource-request"
import { deleteConsentRow, deletePendingAuthorizationCodes, deleteTokenFamily } from "./family"
import { hookNow, type OAuthHookOptions } from "./request"
import { adapterOf, type StoredConsent } from "./store"
import { asDate } from "./values"

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
 * Deletes every expired consent for a client, with its token family, before the
 * authorization-code flow reuses it. 1.7.28's `/oauth2/consent` updates a found consent in place
 * and keeps its old `createdAt`; without this pass, signing in again after ninety days updates the
 * expired row and the first refresh still fails. The scan is per client and only touches grants
 * already outside their absolute lifetime.
 */
export async function expireConsentsForClient(
	ctx: { context: unknown; headers?: Headers | undefined },
	clientId: string,
	options: OAuthHookOptions,
): Promise<void> {
	const adapter = adapterOf(ctx)
	const consents = (await adapter.findMany({
		model: "oauthConsent",
		where: [{ field: "clientId", value: clientId }],
	})) as StoredConsent[]
	for (const consent of consents) {
		if (typeof consent.userId !== "string" || consent.userId === "") continue
		if (!consentExpired(ctx, consent, options)) continue
		try {
			await deleteConsentRow(ctx, consent.id)
			await deleteTokenFamily(ctx, { userId: consent.userId, clientId })
			await deletePendingAuthorizationCodes(ctx, { userId: consent.userId, clientId })
		} catch (error) {
			loggerOf(ctx).error("failed to expire an old grant consent", error)
		}
	}
}

function loggerOf(ctx: { context: unknown }): { error: (...args: unknown[]) => void } {
	const context = ctx.context as { logger?: { error: (...args: unknown[]) => void } }
	return context.logger ?? { error: () => undefined }
}
