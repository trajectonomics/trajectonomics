/**
 * The cron's half of the queue, against a stub D1 that records every statement, plus the real due
 * query against a bun:sqlite database built from the committed migrations. This is the part a
 * browser check cannot reach: the Cron Trigger never fires in the e2e run.
 */

import { Database } from "bun:sqlite"
import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import type { D1Database, Fetcher } from "@cloudflare/workers-types"
import { DELETION_BATCH_LIMIT } from "./core/deletion"
import { DUE_PENDING_DELETIONS_SQL, retryPendingDeletions } from "./pending-deletion-retry"
import type { PendingDeletionRow } from "./pending-deletion-store"

type Statement = { readonly sql: string; readonly params: readonly unknown[] }

/** A D1 stand-in: `all()` answers the due rows, every write and batch is recorded. */
function stubDatabase(due: readonly PendingDeletionRow[]): {
	db: D1Database
	statements: Statement[]
	batches: readonly (readonly Statement[])[]
} {
	const statements: Statement[] = []
	const batches: Statement[][] = []
	const db = {
		prepare(sql: string) {
			let params: readonly unknown[] = []
			const statement = {
				sql,
				get params() {
					return params
				},
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
		async batch(list: Statement[]) {
			batches.push(list)
			for (const statement of list) statements.push(statement)
			return []
		},
	} as unknown as D1Database
	return { db, statements, batches }
}

/** A DATA binding that answers one status. */
function stubData(status: number): Fetcher {
	return {
		fetch: async () => new Response(null, { status }),
	} as unknown as Fetcher
}

const MIGRATIONS = new URL("../migrations/", import.meta.url)

/** A fresh in-memory database with every committed migration applied in order. */
function migrated(): Database {
	const database = new Database(":memory:")
	const files = readdirSync(MIGRATIONS, { encoding: "utf8" })
		.filter((file) => file.endsWith(".sql"))
		.sort()
	for (const file of files) database.exec(readFileSync(new URL(file, MIGRATIONS), "utf8"))
	return database
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
	it("reads the due rows by nextAttemptAt, oldest first, twenty-five at a time", async () => {
		const { db, statements } = stubDatabase([row])
		await retryPendingDeletions({ db, data: stubData(204), nowMs: now })
		const select = statements[0]
		expect(select?.sql).toContain('"acknowledgedAt" is null')
		expect(select?.sql).toContain('"nextAttemptAt" <= ?')
		expect(select?.sql).toContain(
			'not exists (select 1 from "user" where "user"."id" = "pendingDeletion"."authUserId")',
		)
		expect(select?.sql).toContain('order by "nextAttemptAt" asc')
		expect(select?.sql).toContain("limit ?")
		expect(select?.params).toEqual([new Date(now).toISOString(), 25])
	})

	it("acknowledges a row the data Worker accepted, in one batch", async () => {
		const { db, statements, batches } = stubDatabase([row])
		const retried = await retryPendingDeletions({ db, data: stubData(204), nowMs: now })
		expect(retried).toBe(1)
		const update = statements.find((statement) => statement.sql.includes('"acknowledgedAt" = ?'))
		expect(update?.params).toEqual([new Date(now).toISOString(), "row-1"])
		// One batch for the row writes and one for the purges; nothing ran statement by statement.
		expect(batches.length).toBe(2)
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

	it("deletes confirmed notices after thirty days and rate-limit rows after an hour", async () => {
		const { db, statements } = stubDatabase([])
		await retryPendingDeletions({ db, data: stubData(204), nowMs: now })
		const purge = statements.find((statement) =>
			statement.sql.startsWith('delete from "pendingDeletion"'),
		)
		expect(purge?.sql).toContain('"acknowledgedAt" is not null')
		expect(purge?.params).toEqual([new Date(now - 30 * 86_400_000).toISOString()])
		const counters = statements.find((statement) =>
			statement.sql.startsWith('delete from "rateLimit"'),
		)
		expect(counters?.sql).toContain('"lastRequest" < ?')
		expect(counters?.params).toEqual([now - 3_600_000])
	})
})

describe("the due query against the committed migrations", () => {
	it("skips a notice whose user still exists, so a live account is never reported", () => {
		const database = migrated()
		database.exec(
			`insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") values ('live', 'Live', 'live@example.test', 1, '2026-11-27T09:00:00.000Z', '2026-11-27T09:00:00.000Z')`,
		)
		database.exec(
			`insert into "pendingDeletion" ("id", "authUserId", "requestedAt", "acknowledgedAt", "nextAttemptAt", "attempts") values ('live-row', 'live', '2026-11-27T09:00:00.000Z', null, '2026-11-27T09:00:00.000Z', 0), ('gone-row', 'gone', '2026-11-27T09:00:00.000Z', null, '2026-11-27T09:00:00.000Z', 0)`,
		)
		const selected = database
			.query(DUE_PENDING_DELETIONS_SQL)
			.all(new Date(now).toISOString(), DELETION_BATCH_LIMIT) as { id: string }[]
		expect(selected.map((entry) => entry.id)).toEqual(["gone-row"])
		// Skipped, not deleted: the notice is still there for when the user really goes.
		expect(database.query(`select "id" from "pendingDeletion" order by "id"`).all()).toEqual([
			{ id: "gone-row" },
			{ id: "live-row" },
		])
	})

	it("puts sixty failing rows in the future, so a newly due row still runs", () => {
		const database = migrated()
		const future = new Date(now + 3_600_000).toISOString()
		for (let index = 0; index < 60; index += 1) {
			database
				.query(
					`insert into "pendingDeletion" ("id", "authUserId", "requestedAt", "acknowledgedAt", "nextAttemptAt", "attempts") values (?, ?, ?, null, ?, 1)`,
				)
				.run(`old-${index}`, `old-${index}`, new Date(now).toISOString(), future)
		}
		database
			.query(
				`insert into "pendingDeletion" ("id", "authUserId", "requestedAt", "acknowledgedAt", "nextAttemptAt", "attempts") values ('fresh', 'fresh', ?, null, ?, 0)`,
			)
			.run(new Date(now).toISOString(), new Date(now).toISOString())
		const selected = database
			.query(DUE_PENDING_DELETIONS_SQL)
			.all(new Date(now + 1).toISOString(), DELETION_BATCH_LIMIT) as { id: string }[]
		expect(selected.map((entry) => entry.id)).toEqual(["fresh"])
	})

	it("reads the due rows oldest first, up to the limit", () => {
		const database = migrated()
		for (let index = 0; index < 60; index += 1) {
			database
				.query(
					`insert into "pendingDeletion" ("id", "authUserId", "requestedAt", "acknowledgedAt", "nextAttemptAt", "attempts") values (?, ?, ?, null, ?, 0)`,
				)
				.run(
					`${index}`,
					`${index}`,
					new Date(now).toISOString(),
					new Date(now + index * 1_000).toISOString(),
				)
		}
		const selected = database
			.query(DUE_PENDING_DELETIONS_SQL)
			.all(new Date(now + 59_000).toISOString(), DELETION_BATCH_LIMIT) as { id: string }[]
		expect(selected.length).toBe(25)
		expect(selected[0]?.id).toBe("0")
		expect(selected.at(-1)?.id).toBe("24")
	})
})
