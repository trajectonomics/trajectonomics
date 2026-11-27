/**
 * The one statement that deletes a grant's pending authorization codes.
 *
 * 1.7.28 keeps an authorization code in `verification` under its hashed code; `value` is the JSON
 * record `{ type: "authorization_code", userId, query: { client_id }, ... }`. The table has no
 * client index, and anonymous requests (passkey options, social state) fill it, so a paged scan
 * costs one query per hundred rows and misses rows when the table shrinks mid-scan. One statement
 * with bound parameters costs a constant query per revoke, whatever the table holds.
 */
import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types"
import type { GrantOwner } from "./family"

const DELETE_PENDING_AUTHORIZATION_CODES = `delete from verification
where json_valid(value)
	and json_extract(value, '$.type') = 'authorization_code'
	and json_extract(value, '$.userId') = ?1
	and json_extract(value, '$.query.client_id') = ?2`

/** The statement itself, for the revoke's atomic batch. */
export function deletePendingAuthorizationCodesStatement(
	database: D1Database,
	owner: GrantOwner,
): D1PreparedStatement {
	return database.prepare(DELETE_PENDING_AUTHORIZATION_CODES).bind(owner.userId, owner.clientId)
}

/** Deletes every unconsumed authorization code issued for one grant. */
export async function deletePendingAuthorizationCodes(
	database: D1Database,
	owner: GrantOwner,
): Promise<void> {
	await deletePendingAuthorizationCodesStatement(database, owner).run()
}
