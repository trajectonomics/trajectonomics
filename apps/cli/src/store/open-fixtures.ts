import { Database } from "bun:sqlite"
import { expect } from "bun:test"
import { join } from "node:path"
import { capture } from "../test-support"
import { schemaV1 } from "./schema-v1"
import { schemaV2 } from "./schema-v2"
import { schemaV3 } from "./schema-v3"

/**
 * One builder per schema version below head, each producing what that version left on disk.
 * Adding a migration step fails the coverage test below until its predecessor gets a fixture.
 */
export const fixtures: Record<number, (home: string) => Promise<void>> = {
	// Version 0 is exactly what `traj init` leaves behind: an empty WAL database.
	0: async (home) => {
		expect((await capture(["init"], { TRAJ_HOME: home })).code).toBe(0)
	},
	// Version 1 is the five tables, the seeded entity and no correction kind yet.
	1: async (home) => {
		expect((await capture(["init"], { TRAJ_HOME: home })).code).toBe(0)
		const db = new Database(join(home, "traj.db"))
		schemaV1(db)
		db.run("PRAGMA user_version = 1")
		db.close()
	},
	// Version 2 adds the correction kind; it has no household column yet.
	2: async (home) => {
		expect((await capture(["init"], { TRAJ_HOME: home })).code).toBe(0)
		const db = new Database(join(home, "traj.db"))
		schemaV1(db)
		schemaV2(db)
		db.run("PRAGMA user_version = 2")
		db.close()
	},
	3: async (home) => {
		expect((await capture(["init"], { TRAJ_HOME: home })).code).toBe(0)
		const db = new Database(join(home, "traj.db"))
		schemaV1(db)
		schemaV2(db)
		schemaV3(db)
		db.run("PRAGMA user_version = 3")
		db.close()
	},
}
