/**
 * The rows that make up one user+client grant family, and their deletion order.
 *
 * `revoke.ts` deletes a grant's consents, device codes, tokens and pending authorization codes in
 * one D1 batch, so the whole family goes or none of it does. A consent created for a fresh approval
 * deletes its token family through here first: an old token must never attach to a new approval.
 * Pending authorization codes live in `verification` and are deleted by `verification-sql.ts`.
 */
import { adapterOf, findAllPages } from "./adapter"

export type GrantOwner = {
	userId: string
	clientId: string
}

/**
 * The owner's token ids at one instant. Everything the family may delete is listed here, and a
 * token minted after the snapshot is not.
 */
export type TokenIds = {
	accessTokenIds: string[]
	refreshTokenIds: string[]
}

export async function deleteConsentRow(ctx: { context: unknown }, id: string): Promise<void> {
	await adapterOf(ctx).delete({
		model: "oauthConsent",
		where: [{ field: "id", value: id }],
	})
}

/**
 * The token family as it stands now, read before a consent read decides that no live consent
 * exists. The ids, not a timestamp, are the boundary: the library stores a token's `createdAt` in
 * whole seconds, so a token minted later in the same second carries an earlier `createdAt` than a
 * millisecond read time, and a time filter would delete it.
 */
export async function snapshotTokenFamily(
	ctx: { context: unknown },
	owner: GrantOwner,
): Promise<TokenIds> {
	const [accessTokenIds, refreshTokenIds] = await Promise.all([
		findTokenIds(ctx, "oauthAccessToken", owner),
		findTokenIds(ctx, "oauthRefreshToken", owner),
	])
	return { accessTokenIds, refreshTokenIds }
}

async function findTokenIds(
	ctx: { context: unknown },
	model: string,
	owner: GrantOwner,
): Promise<string[]> {
	const rows = await findAllPages<{ id?: unknown }>(ctx, model, [
		{ field: "clientId", value: owner.clientId },
		{ field: "userId", value: owner.userId },
	])
	const ids: string[] = []
	for (const row of rows) if (typeof row.id === "string") ids.push(row.id)
	return ids
}

/**
 * Deletes exactly the tokens a snapshot listed, and nothing else. Any token minted after the
 * snapshot survives: another approval issued it with a consent this delete cannot see, so it is
 * that approval's grant, not a leftover of the one being replaced. An empty snapshot deletes
 * nothing.
 */
export async function deleteTokenFamily(ctx: { context: unknown }, ids: TokenIds): Promise<void> {
	await deleteTokens(ctx, "oauthAccessToken", ids.accessTokenIds)
	await deleteTokens(ctx, "oauthRefreshToken", ids.refreshTokenIds)
}

/** D1 binds at most 100 parameters in one query. */
const DELETE_CHUNK = 100

async function deleteTokens(
	ctx: { context: unknown },
	model: string,
	ids: readonly string[],
): Promise<void> {
	for (let at = 0; at < ids.length; at += DELETE_CHUNK) {
		await adapterOf(ctx).deleteMany({
			model,
			where: [{ field: "id", value: ids.slice(at, at + DELETE_CHUNK), operator: "in" }],
		})
	}
}
