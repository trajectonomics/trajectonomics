// Schema 6 adds `scenario.unstated`, and a schema 5 ledger opens with it NULL (cli ADR-0084).
import { Database } from "bun:sqlite"
import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { PERSONAL_ENTITY_ID } from "./ids"
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
	notes, main, version, created_at, updated_at) VALUES ('${id}', '${PERSONAL_ENTITY_ID}', '${name}',
	'{"schemaVersion":4}', 'jcs1:sha256:0', NULL, '{"people":[]}', NULL, 'old note', 0, 3,
	'2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')`

const COLUMNS =
	"id, name, document, content_hash, household, tax, notes, main, version, created_at, updated_at"

describe("the schema step that adds the unstated column (cli ADR-0084)", () => {
	it("keeps every version 5 Scenario row as it was, with unstated NULL", async () => {
		const home = tempHome()
		await fixtures[5]!(home)
		const db = new Database(join(home, "traj.db"))
		db.run(ROW("0194e000-0001-7000-8000-000000000002", "base"))
		db.run(ROW("0194e000-0001-7000-8000-000000000003", "early"))
		db.close()
		const before = rowsOf(home, `SELECT ${COLUMNS} FROM scenario ORDER BY id`)
		const store = mustOpen(home)
		expect(store.upgradedFrom?.schemaVersion).toBe(5)
		store.close()
		expect(rowsOf(home, `SELECT ${COLUMNS} FROM scenario ORDER BY id`)).toEqual(before)
		expect(rowsOf(home, "SELECT unstated FROM scenario ORDER BY id")).toEqual([
			{ unstated: null },
			{ unstated: null },
		])
	})

	it("opens at schema version 6, with the column present", async () => {
		const home = tempHome()
		await fixtures[5]!(home)
		mustOpen(home).close()
		const version = rowsOf(home, "PRAGMA user_version") as { user_version: number }[]
		expect(version[0]?.user_version).toBe(6)
		const columns = rowsOf(home, "SELECT name FROM pragma_table_info('scenario')") as {
			name: string
		}[]
		expect(columns.map((column) => column.name)).toContain("unstated")
	})
})
