import type { Snapshot } from "../../contract"

/** One plan the ledger holds, as `scenario list` states it, and whether this dashboard projects it. */
export interface PlanRow {
	readonly name: string
	readonly contentHash: string
	readonly main: boolean
	readonly hasNotes: boolean
	/** True when the Snapshot holds reads of the plan; false for a plan outside the `--scenario` list. */
	readonly projected: boolean
}

/**
 * Every plan in the ledger, the main plan first and then in the order `scenario list` states (by name).
 * Empty when the list read failed. Pure: it only orders what the CLI said.
 */
export function planRows(snapshot: Snapshot): PlanRow[] {
	const list = snapshot.reads.scenarios
	if (!list.ok) return []
	const projected = new Set(snapshot.params.scenarios)
	const rows = list.data.scenarios.map((plan) => ({
		name: plan.name,
		contentHash: plan.contentHash,
		main: plan.main === true,
		hasNotes: plan.hasNotes === true,
		projected: projected.has(plan.name),
	}))
	return [...rows.filter((row) => row.main), ...rows.filter((row) => !row.main)]
}

/** The name of the main plan, or null when none is marked. */
export function mainPlan(snapshot: Snapshot): string | null {
	const list = snapshot.reads.scenarios
	return list.ok ? (list.data.scenarios.find((plan) => plan.main === true)?.name ?? null) : null
}

/** Every name the ledger holds, for a new plan's name to be checked against. Empty when the list failed. */
export function storedNames(snapshot: Snapshot): string[] {
	return planRows(snapshot).map((row) => row.name)
}
