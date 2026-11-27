/** The hourly cron's half of the pending deletion queue: read the due rows, retry each once, purge old ones. */
import type { D1Database, Fetcher } from "@cloudflare/workers-types"
import { DELETION_BATCH_LIMIT, purgeCutoffMs } from "./core/deletion"
import { deliverPendingDeletion, type PendingDeletionRow } from "./pending-deletion-store"

/**
 * One cron tick: at most `DELETION_BATCH_LIMIT` due rows, oldest attempt first, each retried once,
 * then the notices the data site confirmed more than thirty days ago are deleted.
 */
export async function retryPendingDeletions(input: {
	db: D1Database
	data: Fetcher | undefined
	nowMs: number
}): Promise<number> {
	const now = new Date(input.nowMs).toISOString()
	const { results } = await input.db
		.prepare(
			'select "id", "authUserId", "requestedAt", "acknowledgedAt", "nextAttemptAt", "attempts" from "pendingDeletion" where "acknowledgedAt" is null and "nextAttemptAt" <= ? order by "nextAttemptAt" asc limit ?',
		)
		.bind(now, DELETION_BATCH_LIMIT)
		.all<PendingDeletionRow>()
	for (const row of results) {
		await deliverPendingDeletion({ db: input.db, data: input.data, row, nowMs: input.nowMs })
	}
	await input.db
		.prepare(
			'delete from "pendingDeletion" where "acknowledgedAt" is not null and "acknowledgedAt" <= ?',
		)
		.bind(new Date(purgeCutoffMs(input.nowMs)).toISOString())
		.run()
	return results.length
}
