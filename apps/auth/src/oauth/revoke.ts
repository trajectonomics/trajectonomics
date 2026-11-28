/**
 * Revoking one grant: every row of its family, in one atomic D1 batch.
 *
 * D1 runs a batch as one transaction, so either every statement lands or none does. A failure
 * therefore leaves the consent in place, the retry finds the grant again, and no pending device
 * code or authorization code survives a revoke that reported success. The order inside the batch
 * is the one the ADR describes: consents, device codes, tokens, then the authorization codes.
 */
import type { D1Database } from "@cloudflare/workers-types"
import type { GrantOwner } from "./family"
import { deletePendingAuthorizationCodesStatement } from "./verification-sql"

type Logger = { error?: (message: string, error?: unknown) => void }

/** The real table and column names, from `migrations/0001_init.sql`. */
const DELETE_CONSENTS = `delete from "oauthConsent" where "clientId" = ?1 and "userId" = ?2`
const DELETE_DEVICE_CODES = `delete from "deviceCode" where "clientId" = ?1 and "userId" = ?2`
const DELETE_ACCESS_TOKENS = `delete from "oauthAccessToken" where "clientId" = ?1 and "userId" = ?2`
const DELETE_REFRESH_TOKENS = `delete from "oauthRefreshToken" where "clientId" = ?1 and "userId" = ?2`

/** Deletes the grant's rows atomically; true only when the whole batch committed. */
export async function revokeGrantFamily(
	ctx: { context: unknown },
	database: D1Database,
	owner: GrantOwner,
): Promise<boolean> {
	try {
		await database.batch([
			database.prepare(DELETE_CONSENTS).bind(owner.clientId, owner.userId),
			database.prepare(DELETE_DEVICE_CODES).bind(owner.clientId, owner.userId),
			database.prepare(DELETE_ACCESS_TOKENS).bind(owner.clientId, owner.userId),
			database.prepare(DELETE_REFRESH_TOKENS).bind(owner.clientId, owner.userId),
			deletePendingAuthorizationCodesStatement(database, owner),
		])
		return true
	} catch (error) {
		const logger = (ctx.context as { logger?: Logger }).logger
		logger?.error?.("the grant revoke did not finish", error)
		return false
	}
}
