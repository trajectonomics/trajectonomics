/**
 * The rows that make up one user+client grant family, and their deletion order.
 *
 * Revocation deletes every consent for the user and client (not just the row the request named),
 * then the pending device codes, then the token family (the same user+client family 1.7.28 uses
 * for replay detection). The consents go first so a concurrent rotation lands on a grant with no
 * approval record and fails closed (ADR 0002). Pending authorization codes live in `verification`
 * and are deleted by `verification-sql.ts`; they go last, after the tokens, so a failure there
 * cannot leave a live token behind.
 */
import { adapterOf } from "./adapter"

export type GrantOwner = {
	userId: string
	clientId: string
}

/** Deletes every consent row for one user and client, so a duplicate cannot survive a revoke. */
export async function deleteConsentsForGrant(
	ctx: { context: unknown },
	owner: GrantOwner,
): Promise<void> {
	await adapterOf(ctx).deleteMany({
		model: "oauthConsent",
		where: [
			{ field: "clientId", value: owner.clientId },
			{ field: "userId", value: owner.userId },
		],
	})
}

export async function deleteConsentRow(ctx: { context: unknown }, id: string): Promise<void> {
	await adapterOf(ctx).delete({
		model: "oauthConsent",
		where: [{ field: "id", value: id }],
	})
}

export async function deleteAccessTokens(
	ctx: { context: unknown },
	owner: GrantOwner,
): Promise<void> {
	await adapterOf(ctx).deleteMany({
		model: "oauthAccessToken",
		where: [
			{ field: "clientId", value: owner.clientId },
			{ field: "userId", value: owner.userId },
		],
	})
}

export async function deleteRefreshTokens(
	ctx: { context: unknown },
	owner: GrantOwner,
): Promise<void> {
	await adapterOf(ctx).deleteMany({
		model: "oauthRefreshToken",
		where: [
			{ field: "clientId", value: owner.clientId },
			{ field: "userId", value: owner.userId },
		],
	})
}

export async function deleteTokenFamily(
	ctx: { context: unknown },
	owner: GrantOwner,
): Promise<void> {
	await deleteAccessTokens(ctx, owner)
	await deleteRefreshTokens(ctx, owner)
}

export async function deleteDeviceCodes(
	ctx: { context: unknown },
	owner: GrantOwner,
): Promise<void> {
	await adapterOf(ctx).deleteMany({
		model: "deviceCode",
		where: [
			{ field: "clientId", value: owner.clientId },
			{ field: "userId", value: owner.userId },
		],
	})
}
