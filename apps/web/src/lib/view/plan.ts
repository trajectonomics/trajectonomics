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

/**
 * The one rule for which plan a page shows, for every page and for Home. `names` is the Snapshot's
 * `params.scenarios`, which the main plan leads (web ADR 0023), so a page opens on the main plan. The
 * plan the address bar names wins when it is one of the names; otherwise the first name. Null when
 * there are no names. Pure: it never reads an object's keys, whose order JavaScript changes for
 * integer-like names.
 */
export function chooseScenario(names: readonly string[], requested: string): string | null {
	return names.includes(requested) ? requested : (names[0] ?? null)
}
