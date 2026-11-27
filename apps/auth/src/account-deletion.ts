/**
 * Telling the data Worker that an account is gone. The auth side deletes the person immediately;
 * the data side's copy of the anonymous id is removed by one call, and a failed call is retried by
 * the hourly cron (`pending-deletion-retry.ts`).
 */
import type { D1Database, Fetcher } from "@cloudflare/workers-types"

/** The private address the service binding answers; the data Worker owns this route. */
export const DATA_DELETE_URL = "https://data.internal/internal/contributors/delete"

/** A call that hangs must not keep a sign-out waiting for long. */
const NOTIFY_TIMEOUT_MS = 5_000

/** The most error text one row keeps. */
const LAST_ERROR_LIMIT = 500

export type DeleteOutcome = { readonly ok: true } | { readonly ok: false; readonly error: string }

/** Rejects after `ms` unless the call has already settled, and can release its timer. */
function timeoutAfter(ms: number): { promise: Promise<never>; cancel: () => void } {
	let timer: ReturnType<typeof setTimeout> | undefined
	const promise = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => reject(new Error(`data Worker did not answer in ${ms} ms`)), ms)
	})
	return {
		promise,
		cancel: () => {
			if (timer !== undefined) clearTimeout(timer)
		},
	}
}

/** Posts one user id to the data Worker; a missing binding is a failure, never a silent success. */
export async function notifyDataWorker(
	data: Fetcher | undefined,
	authUserId: string,
): Promise<DeleteOutcome> {
	if (data === undefined) return { ok: false, error: "DATA service binding is not configured" }
	const timeout = timeoutAfter(NOTIFY_TIMEOUT_MS)
	try {
		const response = await Promise.race([
			data.fetch(DATA_DELETE_URL, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ authUserId }),
			}),
			timeout.promise,
		])
		if (response.ok) return { ok: true }
		return { ok: false, error: `data Worker responded ${response.status}` }
	} catch (error) {
		return { ok: false, error: capErrorText(messageOf(error)) }
	} finally {
		timeout.cancel()
	}
}

/** Inserts the queue row and tries the notification once, before the person's request returns. */
export async function recordPendingDeletion(input: {
	db: D1Database
	data: Fetcher | undefined
	authUserId: string
}): Promise<DeleteOutcome> {
	const id = crypto.randomUUID()
	const requestedAt = new Date().toISOString()
	await input.db
		.prepare(
			'insert into "pendingDeletion" ("id", "authUserId", "requestedAt", "acknowledgedAt", "attempts", "lastError") values (?, ?, ?, null, 0, null)',
		)
		.bind(id, input.authUserId, requestedAt)
		.run()
	const outcome = await notifyDataWorker(input.data, input.authUserId)
	if (outcome.ok) {
		await input.db
			.prepare('update "pendingDeletion" set "acknowledgedAt" = ? where "id" = ?')
			.bind(new Date().toISOString(), id)
			.run()
	} else {
		await input.db
			.prepare('update "pendingDeletion" set "attempts" = ?, "lastError" = ? where "id" = ?')
			.bind(1, outcome.error, id)
			.run()
	}
	return outcome
}

/** The message one thrown value carries, as text. */
export function messageOf(error: unknown): string {
	if (error instanceof Error) return error.message
	return String(error)
}

/** Truncates error text so one broken response cannot fill the table. */
export function capErrorText(value: string): string {
	return value.slice(0, LAST_ERROR_LIMIT)
}
