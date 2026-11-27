/**
 * The pending account deletion queue's storage. A row says "the data Worker has not yet confirmed
 * that this pseudonymous auth user id is gone". It has no foreign key on purpose: the user row is
 * already deleted when the row is written, and the row must outlive it until the data side
 * acknowledges.
 *
 * `nextAttemptAt` is the whole retry schedule: the cron reads the due rows by it, and a failed
 * attempt moves it into the future, so no failing row can starve a newer one.
 */
import type { D1Database, Fetcher } from "@cloudflare/workers-types"
import { retryDueAtMs } from "./core/deletion"
import type { DeleteOutcome } from "./data-worker"
import { capErrorText, messageOf, notifyDataWorker } from "./data-worker"

/** One row of the queue, as the retry code reads it. */
export type PendingDeletionRow = {
	readonly id: string
	readonly authUserId: string
	readonly requestedAt: string
	readonly acknowledgedAt: string | null
	readonly nextAttemptAt: string
	readonly attempts: number
}

/**
 * Queues one deletion notice and returns its id. Called from `beforeDelete`: a throw here must
 * reach Better Auth, which then leaves the person's account in place.
 */
export async function queuePendingDeletion(input: {
	db: D1Database
	authUserId: string
	nowMs?: number
}): Promise<string> {
	const id = crypto.randomUUID()
	const now = new Date(input.nowMs ?? Date.now()).toISOString()
	await input.db
		.prepare(
			'insert into "pendingDeletion" ("id", "authUserId", "requestedAt", "acknowledgedAt", "nextAttemptAt", "attempts", "lastError") values (?, ?, ?, null, ?, 0, null)',
		)
		.bind(id, input.authUserId, now, now)
		.run()
	return id
}

/** The latest row queued for one user, or undefined when `beforeDelete` left none. */
export async function findPendingDeletion(
	db: D1Database,
	authUserId: string,
): Promise<PendingDeletionRow | undefined> {
	const row = await db
		.prepare(
			'select "id", "authUserId", "requestedAt", "acknowledgedAt", "nextAttemptAt", "attempts" from "pendingDeletion" where "authUserId" = ? order by "requestedAt" desc limit 1',
		)
		.bind(authUserId)
		.first<PendingDeletionRow>()
	return row ?? undefined
}

/** Writes one attempt's result: acknowledged on success, backoff and error text on failure. */
export async function recordOutcome(
	db: D1Database,
	row: PendingDeletionRow,
	outcome: DeleteOutcome,
	nowMs: number,
): Promise<void> {
	if (outcome.ok) {
		await db
			.prepare(
				'update "pendingDeletion" set "acknowledgedAt" = ?, "lastError" = null where "id" = ?',
			)
			.bind(new Date(nowMs).toISOString(), row.id)
			.run()
		return
	}
	await db
		.prepare(
			'update "pendingDeletion" set "attempts" = ?, "nextAttemptAt" = ?, "lastError" = ? where "id" = ?',
		)
		.bind(
			row.attempts + 1,
			new Date(retryDueAtMs(nowMs, row.attempts)).toISOString(),
			capErrorText(outcome.error),
			row.id,
		)
		.run()
}

/**
 * Notifies the data Worker about one queued row and records the outcome. Never throws: the person's
 * account is already gone by the time this runs, so a broken data side is the cron's problem.
 */
export async function deliverPendingDeletion(input: {
	db: D1Database
	data: Fetcher | undefined
	row: PendingDeletionRow
	nowMs?: number
}): Promise<DeleteOutcome> {
	const nowMs = input.nowMs ?? Date.now()
	let outcome: DeleteOutcome
	try {
		outcome = await notifyDataWorker(input.data, input.row.authUserId)
	} catch (error) {
		outcome = { ok: false, error: capErrorText(messageOf(error)) }
	}
	try {
		await recordOutcome(input.db, input.row, outcome, nowMs)
	} catch {
		// The row still carries its previous state; the cron retries it.
	}
	return outcome
}
