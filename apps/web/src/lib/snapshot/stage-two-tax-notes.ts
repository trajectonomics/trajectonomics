import type { Read, ScenarioShow } from "../contract"
import { type PlannedRead, plainRead } from "./planned"

/**
 * One `scenario tax --from-stored --dry-run` per Scenario, the CLI's own notes about the stored claims.
 * A dry run rolls the write back, so the read writes nothing, and the name follows `--`, as in the
 * document read, so a name that starts with a dash is still read as a name.
 */
export function planTaxNotes(names: string[]): Record<string, PlannedRead> {
	return Object.fromEntries(
		names.map((name): [string, PlannedRead] => [
			name,
			plainRead(["scenario", "tax", "--from-stored", "--dry-run", "--json", "--", name]),
		]),
	)
}

/** Whether a plan's document read states a stored tax profile: only such a plan can be asked for its notes. */
export function hasTaxProfile(shown: Read<ScenarioShow> | undefined): boolean {
	return shown?.ok === true && shown.data.scenario.tax != null
}
