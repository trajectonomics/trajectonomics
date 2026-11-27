/** The hourly cron's half of the pending deletion queue: read the due rows, retry each once. */
import type { D1Database, Fetcher } from "@cloudflare/workers-types"
import { capErrorText, type DeleteOutcome, notifyDataWorker } from "./account-deletion"
import { DELETION_BATCH_LIMIT, isRetryDue, nextAttempts, retryCutoffMs } from "./core/deletion"

type PendingRow = {
	readonly id: string
	readonly authUserId: string
	readonly requestedAt: string
	readonly attempts: number
}

/** One cron tick: at most `DELETION_BATCH_LIMIT` due rows, each retried once. */
export async function retryPendingDeletions(input: {
	db: D1Database
	data: Fetcher | undefined
	nowMs: number
}): Promise<number> {
	const cutoff = new Date(retryCutoffMs(input.nowMs)).toISOString()
	const { results } = await input.db
		.prepare(
			'select "id", "authUserId", "requestedAt", "attempts" from "pendingDeletion" where "acknowledgedAt" is null and "requestedAt" <= ? order by "requestedAt" asc limit ?',
		)
		.bind(cutoff, DELETION_BATCH_LIMIT)
		.all<PendingRow>()
	let retried = 0
	for (const row of results) {
		if (!isRetryDue(input.nowMs, Date.parse(row.requestedAt), row.attempts)) continue
		retried += 1
		const outcome = await notifyDataWorker(input.data, row.authUserId)
		await recordOutcome(input, row, outcome)
	}
	return retried
}

async function recordOutcome(
	input: { db: D1Database; nowMs: number },
	row: PendingRow,
	outcome: DeleteOutcome,
): Promise<void> {
	if (outcome.ok) {
		await input.db
			.prepare(
				'update "pendingDeletion" set "acknowledgedAt" = ?, "lastError" = null where "id" = ?',
			)
			.bind(new Date(input.nowMs).toISOString(), row.id)
			.run()
		return
	}
	await input.db
		.prepare('update "pendingDeletion" set "attempts" = ?, "lastError" = ? where "id" = ?')
		.bind(nextAttempts(row.attempts), capErrorText(outcome.error), row.id)
		.run()
}
