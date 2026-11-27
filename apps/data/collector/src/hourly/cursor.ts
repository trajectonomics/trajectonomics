import { join } from "node:path"
import { type IngestRow, isQuotaRow } from "../rows"

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/** How far before the cursor each run re-reads, so late rows and clock skew still arrive. */
export const CURSOR_OVERLAP_MS = 6 * HOUR_MS

/** How far back the first run reads when a host has no cursor yet. */
export const FIRST_RUN_MS = 7 * DAY_MS

/** The path of one host's cursor file. */
export function cursorPath(stateDir: string, name: string): string {
	return join(stateDir, `cursor-${name}`)
}

/** The `--since` value for a cursor: six hours before it, or seven days back on a first run. */
export function sinceForCursor(cursor: string | null, nowMs: number): string {
	if (cursor === null) return new Date(nowMs - FIRST_RUN_MS).toISOString()
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
