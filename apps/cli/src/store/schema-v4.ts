import type { Database } from "bun:sqlite"

/**
 * Version 4: `scenario.tax` holds the tax profile `traj scenario tax` was given, beside the
 * Scenario's document (cli ADR-0066). The column is added in place, so no existing row is
 * rewritten: a Scenario saved before this step has no stored profile, which NULL states.
 */
export function schemaV4(db: Database): void {
	db.run("ALTER TABLE scenario ADD COLUMN tax TEXT")
}
