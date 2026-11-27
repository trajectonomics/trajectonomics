/** Creating and updating the `oauthConsent` row that records a grant's approval time. */
import {
	adapterOf,
	findConsent,
	findDeviceCode,
	findDeviceCodeByCode,
	type StoredDeviceCode,
} from "./store"
import { deviceScopes, readField, storedResources } from "./values"

export async function ensureDeviceConsent(ctx: {
	context: unknown
	body?: unknown
}): Promise<void> {
	const deviceCode = readField(ctx.body, "device_code")
	if (typeof deviceCode !== "string" || deviceCode === "") return
	const device = await findDeviceCodeByCode(ctx, deviceCode)
	if (device === null) return
	await consentFromDevice(ctx, device)
}

export async function ensureConsentForApproval(ctx: {
	context: unknown
	body?: unknown
}): Promise<void> {
	const userId = sessionUserId(ctx)
	const userCode = readField(ctx.body, "userCode")
	if (userId === undefined || typeof userCode !== "string") return
	const device = await findDeviceCode(ctx, userCode)
	if (device === null || device.status !== "approved" || device.userId !== userId) return
	await consentFromDevice(ctx, device)
}

async function consentFromDevice(
	ctx: { context: unknown },
	device: StoredDeviceCode,
): Promise<void> {
	if (device.status !== "approved" || typeof device.userId !== "string") return
	if (typeof device.clientId !== "string") return
	await ensureConsent(ctx, {
		clientId: device.clientId,
		userId: device.userId,
		scopes: deviceScopes(device.scope),
		resources: storedResources(device.resources),
	})
}

export async function ensureConsent(
	ctx: { context: unknown },
	input: { clientId: string; userId: string; scopes: string[]; resources: string[] },
): Promise<void> {
	if (input.scopes.length === 0) return
	const adapter = adapterOf(ctx)
	const existing = await findConsent(ctx, input.clientId, input.userId)
	const now = new Date()
	const resources = input.resources.length > 0 ? input.resources : null
	try {
		if (existing !== null) {
			await adapter.update({
				model: "oauthConsent",
				where: [{ field: "id", value: existing.id }],
				update: { scopes: input.scopes, resources, updatedAt: now },
			})
			return
		}
		await adapter.create({
			model: "oauthConsent",
			data: {
				clientId: input.clientId,
				userId: input.userId,
				scopes: input.scopes,
				resources,
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
