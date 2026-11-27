/**
 * The hourly cron's half of the pending deletion queue: read the due rows, retry each once, purge
 * old notices and expired rate-limit counters.
 *
 * A tick is select + one batch of per-row writes + one batch of purges, so twenty-five due rows never
 * cost twenty-five database calls. A row whose user still exists is skipped, not deleted: a failed deletion
 * leaves its queued notice behind, and the data side must never be told about a live account.
 */
import type { D1Database, D1PreparedStatement, Fetcher } from "@cloudflare/workers-types"
import { DELETION_BATCH_LIMIT, purgeCutoffMs } from "./core/deletion"
import {
	attemptPendingDeletion,
	outcomeStatement,
	type PendingDeletionRow,
} from "./pending-deletion-store"

/** How long a rate-limit row is kept after its last request, before the hourly cleanup deletes it. */
export const RATE_LIMIT_MAX_AGE_MS = 3_600_000

/**
 * The due queue rows, oldest attempt first. The `not exists` clause is what keeps a queued notice
 * for a live account out of the retry: only a user who is really gone is reported to the data site.
 */
export const DUE_PENDING_DELETIONS_SQL =
	'select "id", "authUserId", "requestedAt", "acknowledgedAt", "nextAttemptAt", "attempts" from "pendingDeletion" where "acknowledgedAt" is null and "nextAttemptAt" <= ? and not exists (select 1 from "user" where "user"."id" = "pendingDeletion"."authUserId") order by "nextAttemptAt" asc limit ?'

/** The rows the hourly cleanup deletes: confirmed notices past their retention, old counters. */
function purgeStatements(db: D1Database, nowMs: number): D1PreparedStatement[] {
	return [
		db
			.prepare(
				'delete from "pendingDeletion" where "acknowledgedAt" is not null and "acknowledgedAt" <= ?',
			)
			.bind(new Date(purgeCutoffMs(nowMs)).toISOString()),
		db
			.prepare('delete from "rateLimit" where "lastRequest" < ?')
			.bind(nowMs - RATE_LIMIT_MAX_AGE_MS),
	]
}

/**
 * One cron tick: at most `DELETION_BATCH_LIMIT` due rows, oldest attempt first, each retried once,
 * then the notices the data site confirmed more than thirty days ago and the rate-limit counters
 * whose window has long been reused are deleted.
 */
export async function retryPendingDeletions(input: {
	db: D1Database
	data: Fetcher | undefined
	nowMs: number
}): Promise<number> {
	const now = new Date(input.nowMs).toISOString()
	const { results } = await input.db
		.prepare(DUE_PENDING_DELETIONS_SQL)
		.bind(now, DELETION_BATCH_LIMIT)
		.all<PendingDeletionRow>()
	// The data Worker is asked outside the database writes, so a slow answer cannot hold a batch.
	const outcomes = await Promise.all(
		results.map((row) => attemptPendingDeletion({ data: input.data, row })),
	)
	const writes = results.flatMap((row, index) => {
		const outcome = outcomes[index]
		return outcome === undefined ? [] : [outcomeStatement(input.db, row, outcome, input.nowMs)]
	})
	if (writes.length > 0) await input.db.batch(writes)
	await input.db.batch(purgeStatements(input.db, input.nowMs))
	return results.length
}
