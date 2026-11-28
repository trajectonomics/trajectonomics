import type { Database } from "bun:sqlite"

/**
 * Version 6: `scenario.unstated` holds the document paths `traj` wrote, as canonical JSON sorted by
 * path, and NULL when there are none (cli ADR-0084). The column is added in place, so no existing
 * row is rewritten: a Scenario saved before this step has no unstated value (NULL), and its
 * `template-default` values are unknown, not invented.
 */
export function schemaV6(db: Database): void {
	db.run("ALTER TABLE scenario ADD COLUMN unstated TEXT")
}
