import { Database } from "bun:sqlite"
import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { capture } from "../test-support"
import { PERSONAL_ENTITY_ID } from "./ids"
import { HEAD } from "./index"
import { schemaV1 } from "./schema-v1"
import { schemaV2 } from "./schema-v2"
import { schemaV3 } from "./schema-v3"
import { mustOpen, tempHome } from "./testing"

/** The rows of one query on the database a home holds, read through its own connection. */
function rowsOf(home: string, sql: string): unknown[] {
	const db = new Database(join(home, "traj.db"), { readonly: true })
	const rows = db.query(sql).all()
	db.close()
	return rows
}

/** The database a version 3 ledger leaves: the household column, and no tax profile. */
async function version3(home: string): Promise<void> {
	expect((await capture(["init"], { TRAJ_HOME: home })).code).toBe(0)
	const db = new Database(join(home, "traj.db"))
	schemaV1(db)
	schemaV2(db)
	schemaV3(db)
	db.run("PRAGMA user_version = 3")
	db.close()
}

describe("the schema step that adds a tax profile (cli ADR-0066)", () => {
	it("keeps a version 3 Scenario row as it was, with no tax profile", async () => {
		const home = tempHome()
		await version3(home)
		const db = new Database(join(home, "traj.db"))
		db.run(
			`INSERT INTO scenario (id, entity_id, name, document, content_hash, forked_from, household,
			version, created_at, updated_at) VALUES ('0194e000-0001-7000-8000-000000000002',
			'${PERSONAL_ENTITY_ID}', 'base', '{"schemaVersion":4}', 'jcs1:sha256:0', NULL, '{"people":[]}', 3,
			'2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')`,
		)
		db.close()
		const columns = "id, document, content_hash, household, version, created_at, updated_at"
		const before = rowsOf(home, `SELECT ${columns} FROM scenario`)
		mustOpen(home).close()
		expect(rowsOf(home, `SELECT ${columns} FROM scenario`)).toEqual(before)
		expect(rowsOf(home, "SELECT tax FROM scenario")).toEqual([{ tax: null }])
		expect(rowsOf(home, "PRAGMA user_version")).toEqual([{ user_version: HEAD }])
	})
})
