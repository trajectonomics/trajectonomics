/**
 * When a pending account deletion is retried against the data Worker.
 *
 * The deletion itself is immediate; the data side's copy of the pseudonymous auth user id is
 * removed by a call that can fail. A failed row is retried hourly with exponential backoff, so a
 * data Worker that is down or not deployed yet (issue #601) catches up without a person waiting.
 *
 * The table carries `nextAttemptAt`, so the due rows are read with one ordered query: a row that
 * keeps failing moves into the future and cannot hold the batch, and the tick takes them in
 * `nextAttemptAt` order, fifty at a time.
 *
 * Pure: `now` and timestamps arrive as arguments, in milliseconds.
 */

/** The most rows one cron tick attempts; the rest wait for the next hour. */
export const DELETION_BATCH_LIMIT = 50

/** The first retry waits five minutes; each later one doubles. */
export const DELETION_RETRY_BASE_SECONDS = 300

/** The backoff stops growing after a day, so a row is still tried once a day forever. */
export const DELETION_RETRY_CEILING_SECONDS = 86_400

/** An acknowledged notice is kept this long, so a failed deletion can be shown and audited. */
export const DELETION_NOTICE_RETENTION_DAYS = 30

/** A day, in milliseconds, without a leap-second correction. */
const DAY_MS = 86_400_000

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

/**
 * When a row may be attempted again after a failed call: the delay for the attempts it has already
 * made, so the first retry is the five-minute base and every later one doubles.
 */
export function retryDueAtMs(failedAtMs: number, attempts: number): number {
	return failedAtMs + retryDelaySeconds(attempts) * 1_000
}

/**
 * The acknowledged rows a cron tick may purge: the data site confirmed them this long ago, so the
 * notice has served its purpose and the id it holds is deleted with it.
 */
export function purgeCutoffMs(nowMs: number): number {
	return nowMs - DELETION_NOTICE_RETENTION_DAYS * DAY_MS
}
