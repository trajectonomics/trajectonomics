import { SCENARIO_COLUMNS } from "./columns"
import type { Ctx } from "./context"
import type { ScenarioRow } from "./types"

/** A scenario row as SQLite returns it: the main-plan flag is the integer 0 or 1. */
export type RawScenarioRow = Omit<ScenarioRow, "main"> & { main: number }

/** The row with its main-plan flag as a boolean. */
export function toScenarioRow(raw: RawScenarioRow): ScenarioRow {
	return { ...raw, main: raw.main === 1 }
}

export function liveScenario(ctx: Ctx, column: "id" | "name", value: string): ScenarioRow | null {
	const raw = ctx.db
		.query<RawScenarioRow, [string, string]>(
			`SELECT ${SCENARIO_COLUMNS} FROM scenario
			WHERE entity_id = ?1 AND ${column} = ?2 AND deleted_at IS NULL`,
		)
		.get(ctx.entityId, value)
	return raw === null ? null : toScenarioRow(raw)
}

/** The live main plan, or null when none is marked (cli ADR-0071). */
export function mainScenario(ctx: Ctx): ScenarioRow | null {
	const raw = ctx.db
		.query<RawScenarioRow, [string]>(
			`SELECT ${SCENARIO_COLUMNS} FROM scenario
			WHERE entity_id = ?1 AND main = 1 AND deleted_at IS NULL`,
		)
		.get(ctx.entityId)
	return raw === null ? null : toScenarioRow(raw)
}
