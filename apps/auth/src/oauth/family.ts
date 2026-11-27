/**
 * The rows that make up one user+client grant family, and their deletion order.
 *
 * `revoke.ts` deletes a grant's consents, device codes, tokens and pending authorization codes in
 * one D1 batch, so the whole family goes or none of it does. A consent created for a fresh approval
 * deletes its token family through here first: an old token must never attach to a new approval.
 * Pending authorization codes live in `verification` and are deleted by `verification-sql.ts`.
 */
import { adapterOf } from "./adapter"

export type GrantOwner = {
	userId: string
	clientId: string
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
	before: Date,
): Promise<void> {
	await adapterOf(ctx).deleteMany({
		model: "oauthAccessToken",
		where: [
			{ field: "clientId", value: owner.clientId },
			{ field: "userId", value: owner.userId },
			{ field: "createdAt", value: before, operator: "lt" },
		],
	})
}

export async function deleteRefreshTokens(
	ctx: { context: unknown },
	owner: GrantOwner,
	before: Date,
): Promise<void> {
	await adapterOf(ctx).deleteMany({
		model: "oauthRefreshToken",
		where: [
			{ field: "clientId", value: owner.clientId },
			{ field: "userId", value: owner.userId },
			{ field: "createdAt", value: before, operator: "lt" },
		],
	})
}

/**
 * Deletes the token family as it stood before `before`, the read that found no live consent. Only
 * tokens created before that read are leftovers; a token another approval minted after it is
 * live and must survive, even though no consent row was visible to that read.
 */
export async function deleteTokenFamily(
	ctx: { context: unknown },
	owner: GrantOwner,
	before: Date,
): Promise<void> {
	await deleteAccessTokens(ctx, owner, before)
	await deleteRefreshTokens(ctx, owner, before)
}
