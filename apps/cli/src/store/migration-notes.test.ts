import { Database } from "bun:sqlite"
import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { PERSONAL_ENTITY_ID } from "./ids"
import { HEAD } from "./index"
import { fixtures } from "./open-fixtures"
import { mustOpen, tempHome } from "./testing"

/** The rows of one query on the database a home holds, read through its own connection. */
function rowsOf(home: string, sql: string): unknown[] {
	const db = new Database(join(home, "traj.db"), { readonly: true })
	const rows = db.query(sql).all()
	db.close()
	return rows
}

const ROW = (id: string, name: string) =>
	`INSERT INTO scenario (id, entity_id, name, document, content_hash, forked_from, household, tax,
	version, created_at, updated_at) VALUES ('${id}', '${PERSONAL_ENTITY_ID}', '${name}',
	'{"schemaVersion":4}', 'jcs1:sha256:0', NULL, '{"people":[]}', NULL, 3,
	'2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')`

describe("the schema step that adds notes and the main plan (cli ADR-0071)", () => {
	it("keeps every version 4 Scenario row as it was, with no notes and no main plan", async () => {
		const home = tempHome()
		await fixtures[4]!(home)
		const db = new Database(join(home, "traj.db"))
		db.run(ROW("0194e000-0001-7000-8000-000000000002", "base"))
		db.run(ROW("0194e000-0001-7000-8000-000000000003", "early"))
		db.close()
		const columns =
			"id, name, document, content_hash, household, tax, version, created_at, updated_at"
		const before = rowsOf(home, `SELECT ${columns} FROM scenario ORDER BY id`)
		mustOpen(home).close()
		expect(rowsOf(home, `SELECT ${columns} FROM scenario ORDER BY id`)).toEqual(before)
		expect(rowsOf(home, "SELECT notes, main FROM scenario")).toEqual([
			{ notes: null, main: 0 },
			{ notes: null, main: 0 },
		])
		expect(rowsOf(home, "PRAGMA user_version")).toEqual([{ user_version: HEAD }])
	})

	it("lets at most one live Scenario be the main plan", async () => {
		const home = tempHome()
		await fixtures[4]!(home)
		mustOpen(home).close()
		const db = new Database(join(home, "traj.db"))
		db.run(ROW("0194e000-0001-7000-8000-000000000002", "base"))
		db.run(ROW("0194e000-0001-7000-8000-000000000003", "early"))
		db.run("UPDATE scenario SET main = 1 WHERE name = 'base'")
		expect(() => db.run("UPDATE scenario SET main = 1 WHERE name = 'early'")).toThrow()
		db.run("UPDATE scenario SET deleted_at = '2026-03-01T00:00:00.000Z' WHERE name = 'base'")
		db.run("UPDATE scenario SET main = 1 WHERE name = 'early'")
		db.close()
	})
})
