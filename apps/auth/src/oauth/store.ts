import { userCodeCandidates } from "../core/device-code"
import { adapterOf, findAllPages } from "./adapter"
import { hashToken } from "./values"

export type StoredRefreshToken = {
	clientId: string
	userId: string
	resources?: unknown
}
export type StoredConsent = {
	id: string
	clientId: string
	userId?: string | null
	scopes?: unknown
	resources?: unknown
	referenceId?: string | null
	createdAt?: unknown
}
export type StoredDeviceCode = {
	clientId?: string | null
	userId?: string | null
	status?: string | null
	scope?: string | null
	expiresAt?: unknown
	resources?: unknown
}

export async function findRefreshToken(
	ctx: { context: unknown },
	raw: string,
): Promise<StoredRefreshToken | null> {
	const row = await adapterOf(ctx).findOne({
		model: "oauthRefreshToken",
		where: [{ field: "token", value: await hashToken(raw) }],
	})
	return row === null ? null : (row as StoredRefreshToken)
}

export async function findConsent(
	ctx: { context: unknown },
	clientId: string,
	userId: string,
): Promise<StoredConsent | null> {
	const rows = await findConsents(ctx, clientId, userId)
	return rows.find(isDefaultConsent) ?? rows[0] ?? null
}

/** Every consent row for one user and client. More than one is a duplicate the hooks must merge. */
export async function findConsents(
	ctx: { context: unknown },
	clientId: string,
	userId: string,
): Promise<StoredConsent[]> {
	return findAllPages<StoredConsent>(ctx, "oauthConsent", [
		{ field: "clientId", value: clientId },
		{ field: "userId", value: userId },
	])
}

/**
 * Finds a device code by the library's own lookup order: the exact code first, then the
 * normalized (stripped, upper-cased) form when it is a default-alphabet code. The candidates
 * come from `src/core/device-code.ts`.
 */
export async function findDeviceCode(
	ctx: { context: unknown },
	userCode: string,
): Promise<StoredDeviceCode | null> {
	const adapter = adapterOf(ctx)
	for (const candidate of userCodeCandidates(userCode)) {
		const row = await adapter.findOne({
			model: "deviceCode",
			where: [{ field: "userCode", value: candidate }],
		})
		if (row !== null) return row as StoredDeviceCode
	}
	return null
}

function isDefaultConsent(consent: StoredConsent): boolean {
	return (
		consent.referenceId === null || consent.referenceId === undefined || consent.referenceId === ""
	)
}
