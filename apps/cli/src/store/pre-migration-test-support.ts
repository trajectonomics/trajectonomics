import { Database } from "bun:sqlite"
import { expect } from "bun:test"
import { chmodSync, existsSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { capture } from "../test-support"
import { PERSONAL_ENTITY_ID } from "./ids"
import { schemaV1 } from "./schema-v1"
import { schemaV2 } from "./schema-v2"
import { tempHome } from "./testing"

const made: string[] = []

/** Removes every home these helpers made; the tests run it after each test. */
export function cleanUpHomes(): void {
	for (const home of made.splice(0)) {
		if (existsSync(home)) chmodSync(home, 0o700)
		rmSync(dirname(home), { recursive: true, force: true })
	}
}

/** Removes `home` after the test too. */
export function tracked(home: string): string {
	made.push(home)
	return home
}

/** A home at schema version 1 or 2 with one scenario row, so the copy has something to hold. */
export async function atVersion(version: 1 | 2): Promise<string> {
	const home = tracked(tempHome())
	expect((await capture(["init"], { TRAJ_HOME: home })).code).toBe(0)
	const db = new Database(dbOf(home))
	schemaV1(db)
	if (version === 2) schemaV2(db)
	db.run(
		`INSERT INTO scenario (id, entity_id, name, document, content_hash, forked_from, version,
		created_at, updated_at) VALUES ('0194e000-0001-7000-8000-000000000002', '${PERSONAL_ENTITY_ID}',
		'base', '{"schemaVersion":4}', 'jcs1:sha256:0', NULL, 3, '2026-01-01T00:00:00.000Z',
		'2026-02-01T00:00:00.000Z')`,
	)
	db.run(`PRAGMA user_version = ${version}`)
	db.close()
	return home
}

export const dbOf = (home: string): string => join(home, "traj.db")

/** Every row of the tables the version-1 schema has, in a fixed order, read from `file`. */
export function contentOf(file: string): unknown[] {
	const db = new Database(file, { readonly: true })
	const rows = ["entity", "account", "tx", "posting"].map((table) =>
		db.query(`SELECT * FROM ${table} ORDER BY 1`).all(),
	)
	rows.push(db.query("SELECT id, document, content_hash, version FROM scenario").all())
	db.close()
	return rows
}

export function versionOf(file: string): number | undefined {
	const db = new Database(file, { readonly: true })
	const row = db.query<{ user_version: number }, []>("PRAGMA user_version").get()
	db.close()
	return row?.user_version
}
