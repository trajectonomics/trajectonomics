import { Database } from "bun:sqlite"
import { afterEach, describe, expect, it } from "bun:test"
import {
	chmodSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { isAppError } from "../errors"
import { capture } from "../test-support"
import { HEAD, openStore, preMigrationCopies } from "./index"
import { copyBeforeMigrating, copyPath } from "./pre-migration"
import {
	atVersion,
	cleanUpHomes,
	contentOf,
	dbOf,
	tracked,
	versionOf,
} from "./pre-migration-test-support"
import { ledgerHome, mustOpen, steppingClock, tempHome } from "./testing"

afterEach(cleanUpHomes)

const open = (home: string) => openStore({ env: { TRAJ_HOME: home }, clock: steppingClock() })

describe("the copy written before an upgrade migrates the database (cli ADR-0050)", () => {
	it("writes the database as it was, named for its schema version, before the first step", async () => {
		const home = await atVersion(2)
		const before = contentOf(dbOf(home))
		const store = mustOpen(home)
		const copy = copyPath(dbOf(home), 2)
		expect(store.upgradedFrom).toEqual({
			path: copy,
			schemaVersion: 2,
			bytes: statSync(copy).size,
		})
		store.close()
		expect(versionOf(dbOf(home))).toBe(HEAD)
		expect(versionOf(copy)).toBe(2)
		expect(contentOf(copy)).toEqual(before)
		const columns = new Database(copy, { readonly: true })
			.query<{ name: string }, []>("SELECT name FROM pragma_table_info('scenario')")
			.all()
			.map((column) => column.name)
		expect(columns).not.toContain("household")
		expect(statSync(copy).mode & 0o777).toBe(0o600)
	})

	it("leaves nothing but the copy beside the database", async () => {
		const home = await atVersion(1)
		mustOpen(home).close()
		expect(readdirSync(home).sort()).toEqual(["traj.db", "traj.db.pre-v1.bak"])
	})

	it("writes no copy for the empty database init leaves", async () => {
		const home = tracked(tempHome())
		expect((await capture(["init"], { TRAJ_HOME: home })).code).toBe(0)
		const store = mustOpen(home)
		expect(store.upgradedFrom).toBeUndefined()
		store.close()
		expect(versionOf(dbOf(home))).toBe(HEAD)
		expect(preMigrationCopies(dbOf(home))).toEqual([])
	})

	it("writes no copy when no migration is needed", () => {
		const home = tracked(ledgerHome())
		mustOpen(home).close()
		const again = mustOpen(home)
		expect(again.upgradedFrom).toBeUndefined()
		again.close()
		expect(preMigrationCopies(dbOf(home))).toEqual([])
	})

	it("refuses to migrate when the copy cannot be written, and leaves the database as it was", async () => {
		const home = await atVersion(2)
		const before = readFileSync(dbOf(home))
		const target = copyPath(dbOf(home), 2)
		// A directory that holds a file cannot be replaced by the copy.
		mkdirSync(target)
		writeFileSync(join(target, "keep"), "")
		const store = open(home)
		if (!isAppError(store)) throw new Error("expected migration_failed")
		expect(store.body).toMatchObject({
			code: "migration_failed",
			exitCode: 1,
			details: { from: 2, copy: target },
		})
		expect(store.body.message).toContain(target)
		expect(versionOf(dbOf(home))).toBe(2)
		expect(readFileSync(dbOf(home)).equals(before)).toBe(true)
		// No half-written copy is left under another name.
		expect(readdirSync(home).filter((name) => name.endsWith(".tmp"))).toEqual([])
	})

	it("names a data directory it cannot write to as permission denied, on the copy", async () => {
		if (process.getuid?.() === 0) return
		const home = await atVersion(2)
		const db = new Database(dbOf(home))
		chmodSync(home, 0o500)
		try {
			const outcome = copyBeforeMigrating(db, dbOf(home), 2)
			if (!isAppError(outcome)) throw new Error("expected permission_denied")
			expect(outcome.body).toMatchObject({
				code: "permission_denied",
				details: { path: copyPath(dbOf(home), 2) },
			})
		} finally {
			chmodSync(home, 0o700)
			db.close()
		}
		expect(versionOf(dbOf(home))).toBe(2)
	})

	it("keeps the most recent copy per schema version and each version's own", async () => {
		const home = await atVersion(1)
		mustOpen(home).close()
		const first = readFileSync(copyPath(dbOf(home), 1))
		// A person who restores the older copy and upgrades again replaces that version's copy only.
		const db = new Database(copyPath(dbOf(home), 1))
		db.run("UPDATE scenario SET name = 'renamed'")
		db.close()
		rmSync(dbOf(home))
		for (const suffix of ["-wal", "-shm"]) rmSync(`${dbOf(home)}${suffix}`, { force: true })
		writeFileSync(dbOf(home), readFileSync(copyPath(dbOf(home), 1)))
		mustOpen(home).close()
		const second = readFileSync(copyPath(dbOf(home), 1))
		expect(second.equals(first)).toBe(false)
		expect(preMigrationCopies(dbOf(home)).map((c) => c.schemaVersion)).toEqual([1])
		const other = tracked(await atVersion(2))
		mustOpen(other).close()
		expect(readdirSync(other).filter((n) => n.endsWith(".bak"))).toEqual(["traj.db.pre-v2.bak"])
	})

	it("lists the copies beside a database, oldest schema version first", async () => {
		const home = await atVersion(1)
		mustOpen(home).close()
		writeFileSync(copyPath(dbOf(home), 2), "x")
		writeFileSync(join(home, "other.db.pre-v1.bak"), "y")
		expect(preMigrationCopies(dbOf(home)).map((c) => [c.schemaVersion, c.bytes > 0])).toEqual([
			[1, true],
			[2, true],
		])
		expect(preMigrationCopies(join(home, "missing", "traj.db"))).toEqual([])
	})
})
