/**
 * Creating and updating the `oauthConsent` row that records a grant's approval time.
 *
 * A consent is created only when the user approves a device code (the after-hook on
 * `/device/approve`) or when the authorization-code flow writes one on `/oauth2/consent`. The
 * token before-hook never creates one: an approved code left un-redeemed after a revoke fails closed.
 */
import { consentExpired } from "./expiry"
import { deleteConsentRow, deletePendingAuthorizationCodes, deleteTokenFamily } from "./family"
import type { OAuthHookOptions } from "./request"
import { adapterOf, findConsent, findDeviceCode, type StoredDeviceCode } from "./store"
import { deviceScopes, readField, storedResources } from "./values"

export async function ensureConsentForApproval(
	ctx: { context: unknown; body?: unknown },
	options: OAuthHookOptions,
): Promise<void> {
	const userId = sessionUserId(ctx)
	const userCode = readField(ctx.body, "userCode")
	if (userId === undefined || typeof userCode !== "string") return
	const device = await findDeviceCode(ctx, userCode)
	if (device === null || device.status !== "approved" || device.userId !== userId) return
	await consentFromDevice(ctx, device, options)
}

async function consentFromDevice(
	ctx: { context: unknown },
	device: StoredDeviceCode,
	options: OAuthHookOptions,
): Promise<void> {
	if (device.status !== "approved" || typeof device.userId !== "string") return
	if (typeof device.clientId !== "string") return
	await ensureConsent(
		ctx,
		{
			clientId: device.clientId,
			userId: device.userId,
			scopes: deviceScopes(device.scope),
			resources: storedResources(device.resources),
		},
		options,
	)
}

export async function ensureConsent(
	ctx: { context: unknown },
	input: { clientId: string; userId: string; scopes: string[]; resources: string[] },
	options: OAuthHookOptions,
): Promise<void> {
	if (input.scopes.length === 0) return
	try {
		const existing = await findConsent(ctx, input.clientId, input.userId)
		if (existing !== null && !consentExpired(ctx, existing, options)) {
			await adapterOf(ctx).update({
				model: "oauthConsent",
				where: [{ field: "id", value: existing.id }],
				update: {
					scopes: input.scopes,
					resources: input.resources.length > 0 ? input.resources : null,
					updatedAt: new Date(),
				},
			})
			return
		}
		// A newly created consent never attaches to tokens from an earlier grant. An expired
		// consent is deleted first, then its token family, so a concurrent rotation cannot keep a
		// token alive under the fresh approval. Never move `createdAt` without deleting the family.
		if (existing !== null) await deleteConsentRow(ctx, existing.id)
		await deleteTokenFamily(ctx, { userId: input.userId, clientId: input.clientId })
		await deletePendingAuthorizationCodes(ctx, {
			userId: input.userId,
			clientId: input.clientId,
		})
		const now = new Date()
		await adapterOf(ctx).create({
			model: "oauthConsent",
			data: {
				clientId: input.clientId,
				userId: input.userId,
				scopes: input.scopes,
				resources: input.resources.length > 0 ? input.resources : null,
				referenceId: null,
				createdAt: now,
				updatedAt: now,
			},
		})
	} catch (error) {
		// The approval already happened. A missing record fails closed on the next refresh, which is
		// safe; logging keeps the approval response honest instead of turning it into an error.
		loggerOf(ctx).error("failed to record the device grant consent", error)
	}
}

function sessionUserId(ctx: { context: unknown }): string | undefined {
	const context = ctx.context as {
		session?: { user?: { id?: string } } | null
	}
	return context.session?.user?.id
}

function loggerOf(ctx: { context: unknown }): { error: (...args: unknown[]) => void } {
	const context = ctx.context as { logger?: { error: (...args: unknown[]) => void } }
	return context.logger ?? { error: () => undefined }
}
