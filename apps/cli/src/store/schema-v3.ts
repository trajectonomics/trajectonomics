import type { Database } from "bun:sqlite"

/**
 * Version 3: `scenario.household` holds a plan's people and the anchors that pin its dates (cli
 * ADR-0048). The column is added in place, so no existing row is rewritten: a Scenario saved before
 * this step has no household, which NULL states.
 */
export function schemaV3(db: Database): void {
	db.run("ALTER TABLE scenario ADD COLUMN household TEXT")
}
