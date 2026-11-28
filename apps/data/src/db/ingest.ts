import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types"
import { affectedDays } from "../core/rollup"
import type { IngestBatch } from "../core/types"
import { logStatement, quotaStatement, rollupDelete, rollupRebuild, usageStatement } from "./write"

/** What one accepted ingest wrote. */
export type IngestOutcome = {
	accepted: number
	days: string[]
}

/**
 * Upserts a whole validated batch and rebuilds the affected days in one transaction. A token that
 * binds the org row does it as the batch's first statement, inside the same commit (ADR 0015). The
 * bind also refuses a `sub` whose hash is already tombstoned, so a deletion cannot race it.
 */
export async function writeIngest(
	db: D1Database,
	batch: IngestBatch,
	receivedAt: string,
	bind: { sub: string; subHash: string } | null = null,
): Promise<IngestOutcome> {
	const days = affectedDays(batch.usage)
	const statements: D1PreparedStatement[] = []
	if (bind !== null) {
		statements.push(
			db
				.prepare(
					"UPDATE contributor SET auth_user_id = ? WHERE id = 'trajectonomics' AND auth_user_id IS NULL AND NOT EXISTS (SELECT 1 FROM contributor_tombstone WHERE auth_user_hash = ?)",
				)
				.bind(bind.sub, bind.subHash),
		)
	}
	for (const row of batch.usage) {
		statements.push(usageStatement(db, batch.contributorId, row, receivedAt))
	}
	for (const row of batch.quota) {
		statements.push(quotaStatement(db, batch.contributorId, row, receivedAt))
	}
	for (const day of days) {
		statements.push(rollupDelete(db, batch.series, day))
		statements.push(rollupRebuild(db, batch.series, day))
	}
	statements.push(
		logStatement(db, batch.contributorId, receivedAt, batch.usage.length + batch.quota.length),
	)
	await db.batch(statements)
	return { accepted: batch.usage.length + batch.quota.length, days }
}
