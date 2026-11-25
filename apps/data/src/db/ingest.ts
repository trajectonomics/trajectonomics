import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types"
import type { UsageRow } from "@trajectonomics/data-collector/types"
import { mergeUsage } from "../core/merge"
import { affectedDays, buildRollups } from "../core/rollup"
import type { IngestBatch } from "../core/types"
import { readUsageDay } from "./read"
import { logStatement, quotaStatement, rollupDelete, rollupInsert, usageStatement } from "./write"

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
	const stored: UsageRow[] = []
	for (const day of days) stored.push(...(await readUsageDay(db, batch.contributorId, day)))
	const merged = mergeUsage(stored, batch.usage)
	const rollups = buildRollups(merged, batch.series)
	const statements: D1PreparedStatement[] = batch.usage.map((row) =>
		usageStatement(db, batch.contributorId, row, receivedAt),
	)
	for (const row of batch.quota) {
		statements.push(quotaStatement(db, batch.contributorId, row, receivedAt))
	}
	for (const day of days) {
		statements.push(rollupDelete(db, batch.series, day))
		for (const rollup of rollups) {
			if (rollup.day === day) statements.push(rollupInsert(db, rollup))
		}
	}
	statements.push(
		logStatement(db, batch.contributorId, receivedAt, batch.usage.length + batch.quota.length),
	)
	await db.batch(statements)
	return { accepted: batch.usage.length + batch.quota.length, days }
}
