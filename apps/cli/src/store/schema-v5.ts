import type { Database } from "bun:sqlite"

/**
 * Version 5: `scenario.notes` holds what a person wrote about a plan, and `scenario.main` marks
 * the ledger's main plan (cli ADR-0071). Both columns are added in place, so no existing row is
 * rewritten: a Scenario saved before this step has no notes (NULL) and is not the main plan (0).
 * The partial unique index keeps at most one live main plan.
 */
export function schemaV5(db: Database): void {
	db.run("ALTER TABLE scenario ADD COLUMN notes TEXT")
	db.run("ALTER TABLE scenario ADD COLUMN main INTEGER NOT NULL DEFAULT 0 CHECK (main IN (0, 1))")
	db.run(
		"CREATE UNIQUE INDEX scenario_one_main ON scenario (entity_id) WHERE main = 1 AND deleted_at IS NULL",
	)
}
