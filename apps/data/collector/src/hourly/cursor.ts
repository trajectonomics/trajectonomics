import { join } from "node:path"
import { type IngestRow, isQuotaRow } from "../rows"

const HOUR_MS = 3_600_000

/** How far before the cursor each run re-reads, so late rows and clock skew still arrive. */
export const CURSOR_OVERLAP_MS = 6 * HOUR_MS

/** The path of one host's cursor file. */
export function cursorPath(stateDir: string, name: string): string {
	return join(stateDir, `cursor-${name}`)
}

/** The start of the UTC hour a clock reading falls in, as the API's canonical timestamp. */
function hourStart(nowMs: number): string {
	return new Date(Math.floor(nowMs / HOUR_MS) * HOUR_MS).toISOString()
}

/**
 * The `--since` value for a cursor: six hours before it, or the start of the current UTC hour on a
 * first run. A first run sends no history; the site shows only what was collected live.
 */
export function sinceForCursor(cursor: string | null, nowMs: number): string {
	if (cursor === null) return hourStart(nowMs)
	const ms = Date.parse(cursor)
	if (Number.isNaN(ms)) throw new Error(`cursor is not an ISO timestamp: ${cursor}`)
	return new Date(ms - CURSOR_OVERLAP_MS).toISOString()
}

/** The latest usage hour among rows; quota rows never move the cursor. */
export function latestUsageHour(rows: readonly IngestRow[]): string | null {
	let latest = Number.NEGATIVE_INFINITY
	for (const row of rows) {
		if (isQuotaRow(row)) continue
		const ms = Date.parse(row.hourUtc)
		if (!Number.isNaN(ms) && ms > latest) latest = ms
	}
	return Number.isFinite(latest) ? new Date(latest).toISOString() : null
}
