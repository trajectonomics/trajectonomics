/**
 * What happens to an account that is being deleted, on the auth side: the queue row is inserted
 * before the person's row is removed, and the rows that can still name the id are deleted after.
 *
 * The order is the point. Better Auth runs `beforeDelete` first, so a database that cannot queue
 * the notice aborts the deletion: a person's account is never removed while the data site would
 * never be told. Only once the user row is gone does the data side hear about it.
 */

import type { D1Database, Fetcher } from "@cloudflare/workers-types"
import type { BetterAuthOptions } from "better-auth"
import {
	deliverPendingDeletion,
	findPendingDeletion,
	queuePendingDeletion,
} from "./pending-deletion-store"

/**
 * Deletes the rows that can still name the deleted person. Better Auth removes the user, the
 * sessions, the accounts and everything a foreign key cascades, but `deviceCode` and `verification`
 * (where an authorization code lives) have no foreign key on purpose, so a leftover row would keep
 * the user id after the account is gone.
 */
export async function deleteUserLeftovers(db: D1Database, authUserId: string): Promise<void> {
	// The verification value is the provider's own JSON. An authorization code names the user as
	// `"userId":"<id>"` and is matched with LIKE; a passkey challenge (registration or
	// authentication) nests it as `"userData":{"id":"<id>"…}` and is matched with instr. LIKE is not
	// used for the passkey form because D1 caps a LIKE pattern at 50 bytes.
	const authorizationCodeValue = `%"userId":"${authUserId}"%`
	const passkeyUserIdValue = `"id":"${authUserId}"`
	await db.batch([
		db.prepare('delete from "deviceCode" where "userId" = ?').bind(authUserId),
		db
			.prepare('delete from "verification" where "value" like ? or instr("value", ?) > 0')
			.bind(authorizationCodeValue, passkeyUserIdValue),
	])
}

/**
 * `afterDelete`: clean the leftovers, then tell the data Worker once. A failure here is recorded on
 * the row and retried by the cron, so the sign-out never waits on the data side.
 */
export async function finishAccountDeletion(input: {
	db: D1Database
	data: Fetcher | undefined
	authUserId: string
	nowMs?: number
}): Promise<void> {
	try {
		await deleteUserLeftovers(input.db, input.authUserId)
	} catch {
		// A leftover row is not worth failing the response for; the id is no longer a live account.
	}
	// The user row is already gone here, so nothing below may fail the response: the page would
	// then say "not deleted" for a deleted account. The queued row stays, and the cron retries it.
	try {
		const row = await findPendingDeletion(input.db, input.authUserId)
		if (row === undefined || row.acknowledgedAt !== null) return
		await deliverPendingDeletion({
			db: input.db,
			data: input.data,
			row,
			...(input.nowMs === undefined ? {} : { nowMs: input.nowMs }),
		})
	} catch {
		// Left for the cron.
	}
}

/** The `deleteUser` options: queue first, then delete, then tell the data side. */
export function deleteUserOptions(env: {
	DB: D1Database
	DATA?: Fetcher | undefined
}): NonNullable<NonNullable<BetterAuthOptions["user"]>["deleteUser"]> {
	return {
		enabled: true,
		// The notice is queued *before* the person's row is removed, so a database that cannot queue
		// it aborts the deletion. The insert throws, and Better Auth stops there.
		beforeDelete: async (user) => {
			await queuePendingDeletion({ db: env.DB, authUserId: user.id })
		},
		// `afterDelete` runs only once Better Auth has deleted the user row, and a failed deletion
		// never reaches it, so the data side is never told about a live account from here. The
		// person's marketing consent rows go with the user row (the schema cascades on `userId`).
		// The rows that can still name the id (`deviceCode`, the `verification` rows that hold an
		// authorization code or a passkey challenge) have no foreign key, so they are deleted here
		// too. Only then is the data side told, once; a failed call is recorded on the row and
		// retried by the cron.
		afterDelete: async (user) => {
			try {
				await finishAccountDeletion({ db: env.DB, data: env.DATA, authUserId: user.id })
			} catch {
				// The account is already gone; the queued row is the cron's to retry.
			}
		},
	}
}
