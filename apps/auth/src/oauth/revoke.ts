/**
 * Revoking one grant: every row of its family, in the order that leaves nothing usable behind.
 *
 * Consents first, so a concurrent rotation lands on a grant with no approval record; then the
 * pending device codes; then the token family; then the pending authorization codes. The token
 * family goes before `verification` so a failure there cannot leave a live token behind. Every
 * step is tried even when an earlier one fails, and `false` says the revoke was not complete.
 */
import type { D1Database } from "@cloudflare/workers-types"
import {
	deleteAccessTokens,
	deleteConsentsForGrant,
	deleteDeviceCodes,
	deleteRefreshTokens,
	type GrantOwner,
} from "./family"
import { deletePendingAuthorizationCodes } from "./verification-sql"

type Logger = { error?: (message: string, error?: unknown) => void }

/** Deletes the grant's rows; true only when every step finished. */
export async function revokeGrantFamily(
	ctx: { context: unknown },
	database: D1Database,
	owner: GrantOwner,
): Promise<boolean> {
	const steps: Array<() => Promise<void>> = [
		() => deleteConsentsForGrant(ctx, owner),
		() => deleteDeviceCodes(ctx, owner),
		() => deleteAccessTokens(ctx, owner),
		() => deleteRefreshTokens(ctx, owner),
		() => deletePendingAuthorizationCodes(database, owner),
	]
	const failures: unknown[] = []
	for (const step of steps) {
		try {
			await step()
		} catch (error) {
			failures.push(error)
		}
	}
	if (failures.length === 0) return true
	const logger = (ctx.context as { logger?: Logger }).logger
	for (const error of failures) logger?.error?.("the grant revoke did not finish", error)
	return false
}
