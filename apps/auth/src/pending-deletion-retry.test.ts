/**
 * The cron's half of the queue, against a stub D1 that records every statement. This is the part a
 * browser check cannot reach: the Cron Trigger never fires in the e2e run.
 */

import { describe, expect, it } from "bun:test"
import type { D1Database, Fetcher } from "@cloudflare/workers-types"
import { retryPendingDeletions } from "./pending-deletion-retry"
import type { PendingDeletionRow } from "./pending-deletion-store"

type Statement = { readonly sql: string; readonly params: readonly unknown[] }

/** A D1 stand-in: `all()` answers the due rows, every `run()` is recorded, nothing throws. */
function stubDatabase(due: readonly PendingDeletionRow[]): {
	db: D1Database
	statements: Statement[]
} {
	const statements: Statement[] = []
	const db = {
		prepare(sql: string) {
			let params: readonly unknown[] = []
			const statement = {
				bind(...values: unknown[]) {
					params = values
					return statement
				},
				async all() {
					statements.push({ sql, params })
					return { results: due, success: true, meta: {} }
				},
				async run() {
					statements.push({ sql, params })
					return { results: [], success: true, meta: {} }
				},
				async first() {
					statements.push({ sql, params })
					return null
				},
			}
			return statement
		},
	} as unknown as D1Database
	return { db, statements }
}

/** A DATA binding that answers one status. */
function stubData(status: number): Fetcher {
	return {
		fetch: async () => new Response(null, { status }),
	} as unknown as Fetcher
}

const now = Date.parse("2026-11-27T10:00:00.000Z")
const row: PendingDeletionRow = {
	id: "row-1",
	authUserId: "user-1",
	requestedAt: "2026-11-27T09:00:00.000Z",
	acknowledgedAt: null,
	nextAttemptAt: "2026-11-27T09:05:00.000Z",
	attempts: 0,
}

describe("one cron tick", () => {
	it("reads the due rows by nextAttemptAt, oldest first, fifty at a time", async () => {
		const { db, statements } = stubDatabase([row])
		await retryPendingDeletions({ db, data: stubData(204), nowMs: now })
		const select = statements[0]
		expect(select?.sql).toContain('"acknowledgedAt" is null')
		expect(select?.sql).toContain('"nextAttemptAt" <= ?')
		expect(select?.sql).toContain('order by "nextAttemptAt" asc')
		expect(select?.sql).toContain("limit ?")
		expect(select?.params).toEqual([new Date(now).toISOString(), 50])
	})

	it("acknowledges a row the data Worker accepted", async () => {
		const { db, statements } = stubDatabase([row])
		const retried = await retryPendingDeletions({ db, data: stubData(204), nowMs: now })
		expect(retried).toBe(1)
		const update = statements.find((statement) => statement.sql.includes('"acknowledgedAt" = ?'))
		expect(update?.params).toEqual([new Date(now).toISOString(), "row-1"])
	})

	it("moves a failed row five minutes out and counts the attempt", async () => {
		const { db, statements } = stubDatabase([row])
		const retried = await retryPendingDeletions({ db, data: stubData(500), nowMs: now })
		expect(retried).toBe(1)
		const backoff = statements.find((statement) => statement.sql.includes('"nextAttemptAt" = ?'))
		expect(backoff?.sql).toContain('"attempts" = ?')
		expect(backoff?.params?.[0]).toBe(1)
		expect(backoff?.params?.[1]).toBe(new Date(now + 5 * 60_000).toISOString())
		expect(String(backoff?.params?.[2])).toContain("data Worker responded 500")
		expect(backoff?.params?.[3]).toBe("row-1")
	})

	it("deletes the notices the data site confirmed thirty days ago", async () => {
		const { db, statements } = stubDatabase([])
		await retryPendingDeletions({ db, data: stubData(204), nowMs: now })
		const purge = statements.find((statement) =>
			statement.sql.startsWith('delete from "pendingDeletion"'),
		)
		expect(purge?.sql).toContain('"acknowledgedAt" is not null')
		expect(purge?.params).toEqual([new Date(now - 30 * 86_400_000).toISOString()])
	})
})
