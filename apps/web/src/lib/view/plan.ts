import { type PlanRow, planRows } from "./plans/rows"
import type { SnapshotState } from "./state"

/**
 * The Scenario names the plan switcher offers: the names the Snapshot holds reads for, in the
 * Snapshot's order. None unless the Snapshot is ready, so the switcher is hidden while it loads.
 */
export function scenarioNames(state: SnapshotState): readonly string[] {
	return state.status === "ready" ? state.snapshot.params.scenarios : []
}

/** What the Snapshot says of each plan the pages can show, the main plan first; none unless the Snapshot is ready. */
export function projectedRows(state: SnapshotState): PlanRow[] {
	return state.status === "ready" ? planRows(state.snapshot).filter((row) => row.projected) : []
}
