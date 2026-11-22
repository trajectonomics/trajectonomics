import { Database } from "bun:sqlite"
import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { isAppError } from "../errors"
import { LOADED_MACHINE_MS } from "../test-timeouts"
import { HEAD, openStore } from "./index"
import { ledgerHome, must, mustOpen, steppingClock } from "./testing"

const CHILD = join(import.meta.dir, "concurrent-writer.fixture.ts")

/**
 * Spawns `writers` processes that each save `count` times. SQLite hands the write lock to whichever
 * waiter wakes first, not in turn, and a holder that loses its CPU keeps the lock while it waits to
 * run again, so the default busy timeout (5 s) is a wall-clock budget that a loaded 4-core machine
 * can spend with no fault in the store (#236). The writers get a timeout as long as the test's own
 * ceiling instead: a write the store really loses or refuses still fails, only later.
 */
async function spawnWriters(home: string, writers: number, count: number) {
	const busyMs = String(LOADED_MACHINE_MS)
	const children = Array.from({ length: writers }, (_, writer) =>
		Bun.spawn([process.execPath, CHILD, home, String(writer), String(count), busyMs], {
			stdout: "pipe",
			stderr: "pipe",
		}),
	)
	return Promise.all(
		children.map(async (child) => ({
			code: await child.exited,
			err: await new Response(child.stderr).text(),
		})),
	)
}

function health(home: string) {
	const db = new Database(join(home, "traj.db"), { readonly: true })
	const result = {
		version: db.query<{ user_version: number }, []>("PRAGMA user_version").get()?.user_version,
		integrity: db.query("PRAGMA integrity_check").all(),
		foreignKeys: db.query("PRAGMA foreign_key_check").all(),
		entities: db.query("SELECT id FROM entity ORDER BY id").all().length,
	}
	db.close()
	return result
}

describe("concurrency", () => {
	it(
		"lets concurrent first-opens all end at head with one seeded entity",
		async () => {
			const home = ledgerHome()
			const results = await spawnWriters(home, 8, 0)
			expect(results).toEqual(results.map(() => ({ code: 0, err: "" })))
			expect(health(home)).toEqual({
				version: HEAD,
				integrity: [{ integrity_check: "ok" }],
				foreignKeys: [],
				entities: 1,
			})
		},
		LOADED_MACHINE_MS,
	)

	it(
		"exits a writer process non-zero with the envelope when the store refuses it",
		async () => {
			const home = ledgerHome()
			mustOpen(home).close()
			const db = new Database(join(home, "traj.db"))
			db.run(`PRAGMA user_version = ${HEAD + 1}`)
			db.close()
			const [result] = await spawnWriters(home, 1, 1)
			expect(result?.code).toBe(1)
			expect(JSON.parse(result?.err ?? "")).toMatchObject({ code: "database_too_new" })
		},
		LOADED_MACHINE_MS,
	)

	it(
		"loses no write when N processes write in parallel",
		async () => {
			const home = ledgerHome()
			const setup = mustOpen(home)
			must(setup.createAccount({ name: "Cash", type: "asset", currency: "THB" }))
			must(setup.createAccount({ name: "Food", type: "expense", currency: "THB" }))
			setup.close()
			const [writers, count] = [8, 50]
			const results = await spawnWriters(home, writers, count)
			expect(results).toEqual(results.map(() => ({ code: 0, err: "" })))
			const store = mustOpen(home)
			const [shared] = must(store.listScenarios({ sort: "name" }))
			// The first save creates version 1 and every later save bumps it by exactly one.
			expect(shared?.version).toBe(writers * count)
			expect(must(store.listTransactions({ sort: "id" }))).toHaveLength(writers * count)
			expect(must(store.listPostings({ sort: "tx_id" }))).toHaveLength(2 * writers * count)
			store.close()
			const { integrity, foreignKeys } = health(home)
			expect(integrity).toEqual([{ integrity_check: "ok" }])
			expect(foreignKeys).toEqual([])
		},
		LOADED_MACHINE_MS,
	)

	it("reports contention that outlives the busy timeout as a retryable conflict", () => {
		const home = ledgerHome()
		mustOpen(home).close()
		const holder = new Database(join(home, "traj.db"))
		holder.run("BEGIN IMMEDIATE")
		const store = openStore({ env: { TRAJ_HOME: home }, clock: steppingClock(), busyTimeoutMs: 20 })
		if (isAppError(store)) throw new Error(JSON.stringify(store.body))
		const outcome = store.createAccount({ name: "Cash", type: "asset", currency: "THB" })
		holder.run("ROLLBACK")
		holder.close()
		if (!isAppError(outcome)) throw new Error("expected database_busy")
		expect(outcome.body).toMatchObject({
			code: "database_busy",
			exitCode: 5,
			details: { retryable: true },
		})
		expect(must(store.listAccounts({ sort: "id" }))).toEqual([])
		store.close()
	})
})
