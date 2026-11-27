/**
 * When a pending account deletion is retried against the data Worker.
 *
 * The deletion itself is immediate; the data side's copy of the anonymous auth user id is removed
 * by a call that can fail. A failed row is retried hourly with exponential backoff, so a data
 * Worker that is down or not deployed yet (issue #601) catches up without a person waiting.
 *
 * Pure: `now` and timestamps arrive as arguments, in milliseconds.
 */

/** The most rows one cron tick attempts; the rest wait for the next hour. */
export const DELETION_BATCH_LIMIT = 50

/** The first retry waits five minutes; each later one doubles. */
export const DELETION_RETRY_BASE_SECONDS = 300

/** The backoff stops growing after a day, so a row is still tried once a day forever. */
export const DELETION_RETRY_CEILING_SECONDS = 86_400

/** A usable attempt count: whole, non-negative, and finite. */
export function safeAttempts(attempts: number): number {
	if (!Number.isFinite(attempts) || attempts <= 0) return 0
	return Math.floor(attempts)
}

/** The delay after a given number of failed attempts, capped at the ceiling. */
export function retryDelaySeconds(attempts: number): number {
	const doublings = Math.min(safeAttempts(attempts), 20)
	return Math.min(DELETION_RETRY_BASE_SECONDS * 2 ** doublings, DELETION_RETRY_CEILING_SECONDS)
}

/** The earliest moment a row with this history may be attempted again. */
export function retryDueAtMs(requestedAtMs: number, attempts: number): number {
	return requestedAtMs + retryDelaySeconds(attempts) * 1_000
}

/** Whether one row is due at `nowMs`. */
export function isRetryDue(nowMs: number, requestedAtMs: number, attempts: number): boolean {
	if (!Number.isFinite(requestedAtMs)) return false
	return nowMs >= retryDueAtMs(requestedAtMs, attempts)
}

/**
 * The query's lower bound: no attempt is ever due before the base delay, so an older row can be
 * filtered in SQL without reading every pending row on each tick.
 */
export function retryCutoffMs(nowMs: number): number {
	return nowMs - DELETION_RETRY_BASE_SECONDS * 1_000
}

/** The attempts value after one more failed call. */
export function nextAttempts(attempts: number): number {
	return safeAttempts(attempts) + 1
}
