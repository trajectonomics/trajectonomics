/**
 * The rows that make up one user+client grant family, and their deletion order.
 *
 * `revoke.ts` deletes a grant's consents, device codes, tokens and pending authorization codes in
 * one D1 batch, so the whole family goes or none of it does. A consent created for a fresh approval
 * deletes its token family through here first, so an old token does not attach to a new approval
 * (ADR 0002 names the in-flight exchange that can still slip past).
 * Pending authorization codes live in `verification` and are deleted by `verification-sql.ts`.
 *
 * Both steps cost a constant number of statements however large the family is: one for the
 * snapshot, and one batch of at most two deletes. The library keeps every rotated refresh row, so
 * one machine refreshing hourly leaves about 2,160 rows in ninety days; a paged scan or a delete
 * per hundred ids would pass D1's fifty-query cap for one invocation and fail the approval.
 */
import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types"
import { adapterOf } from "./adapter"

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

/** The real table and column names, from `migrations/0001_init.sql`. */
const SELECT_TOKEN_IDS = `select 'a' as kind, "id" from "oauthAccessToken"
where "clientId" = ?1 and "userId" = ?2
union all
select 'r', "id" from "oauthRefreshToken" where "clientId" = ?1 and "userId" = ?2`

/**
 * The family as it stands now, in one statement. The ids, not a timestamp, are the boundary: the
 * library stores a token's `createdAt` in whole seconds, so a token minted later in the same second
 * carries an earlier `createdAt` than a millisecond read time, and a time filter would delete it.
 */
export async function snapshotTokenFamily(
	database: D1Database,
	owner: GrantOwner,
): Promise<TokenIds> {
	const { results } = await database
		.prepare(SELECT_TOKEN_IDS)
		.bind(owner.clientId, owner.userId)
		.all<{ kind?: unknown; id?: unknown }>()
	const ids: TokenIds = { accessTokenIds: [], refreshTokenIds: [] }
	for (const row of results) {
		if (typeof row.id !== "string") continue
		if (row.kind === "a") ids.accessTokenIds.push(row.id)
		else if (row.kind === "r") ids.refreshTokenIds.push(row.id)
	}
	return ids
}

const DELETE_ACCESS_TOKENS = `delete from "oauthAccessToken"
where "id" in (select value from json_each(?1))`
const DELETE_REFRESH_TOKENS = `delete from "oauthRefreshToken"
where "id" in (select value from json_each(?1))`

/**
 * Deletes exactly the tokens a snapshot listed, and nothing else, in one batch of at most two
 * statements. Any token minted after the snapshot survives: another approval issued it with a
 * consent this delete cannot see, so it is that approval's grant, not a leftover of the one being
 * replaced. An empty list skips its statement, and an empty snapshot deletes nothing.
 *
 * Access tokens go first: `oauthAccessToken.refreshId` references the refresh row.
 */
export async function deleteTokenFamily(database: D1Database, ids: TokenIds): Promise<void> {
	const statements: D1PreparedStatement[] = []
	if (ids.accessTokenIds.length > 0)
		statements.push(database.prepare(DELETE_ACCESS_TOKENS).bind(JSON.stringify(ids.accessTokenIds)))
	if (ids.refreshTokenIds.length > 0)
		statements.push(
			database.prepare(DELETE_REFRESH_TOKENS).bind(JSON.stringify(ids.refreshTokenIds)),
		)
	if (statements.length > 0) await database.batch(statements)
}
