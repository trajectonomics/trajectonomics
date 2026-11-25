import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types"
import { affectedDays } from "../core/rollup"
import type { IngestBatch } from "../core/types"
import { logStatement, quotaStatement, rollupDelete, rollupRebuild, usageStatement } from "./write"

/** What one accepted ingest wrote. */
export type IngestOutcome = {
	accepted: number
	days: string[]
}

/** Upserts a whole validated batch and rebuilds the affected days in one transaction. */
export async function writeIngest(
	db: D1Database,
	batch: IngestBatch,
	receivedAt: string,
): Promise<IngestOutcome> {
	const days = affectedDays(batch.usage)
	const statements: D1PreparedStatement[] = batch.usage.map((row) =>
		usageStatement(db, batch.contributorId, row, receivedAt),
	)
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
