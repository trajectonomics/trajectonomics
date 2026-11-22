import { dayPosition, type LineMarker } from "../../chart"
import type { ProjectionRun, Read } from "../../contract"
import { annualRowsOf } from "../projection/annual"
import type { SnapshotState } from "../state"

/** One Milestone row of a projection, as the CLI states it. */
export type MilestoneRow = Extract<
	ProjectionRun["tables"][number],
	{ name: "milestones" }
>["rows"][number]

/** A Milestone the plan reached, with the date the CLI gave it. */
export interface ReachedMilestone {
	readonly id: string
	readonly date: string
}

/** A Milestone the plan did not reach, with the date the CLI says it was not reached by. */
export interface UnreachedMilestone {
	readonly id: string
	readonly notReachedBy: string
}

/** The Milestones of one projection: the reached ones in date order, the unreached ones in Scenario order. */
export interface MilestoneView {
	readonly reached: readonly ReachedMilestone[]
	readonly unreached: readonly UnreachedMilestone[]
}

/** The milestones table of a projection, in Scenario order. Null when the Scenario declares none. */
export function milestoneRowsOf(run: ProjectionRun): readonly MilestoneRow[] | null {
	for (const table of run.tables) {
		if (table.name === "milestones") return table.rows
	}
	return null
}

/**
 * The page's view of a projection's milestones. Reached rows sort by their CLI date, compared as text;
 * a tie keeps Scenario order, since the sort is stable. An unreached row is labelled with the run-out
 * date, or the horizon when the plan did not run out. Null when the projection has no milestones table.
 */
export function milestoneView(run: ProjectionRun): MilestoneView | null {
	const rows = milestoneRowsOf(run)
	if (rows === null) return null
	const reached = rows.flatMap((row) => (row.date === null ? [] : [{ id: row.id, date: row.date }]))
	reached.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
	const notReachedBy = run.runsOut?.date ?? run.horizon
	const unreached = rows.flatMap((row) => (row.date === null ? [{ id: row.id, notReachedBy }] : []))
	return { reached, unreached }
}

/**
 * The reached milestones as vertical rules on the net-worth chart. Each sits at the x position of its
 * date among the annual rows, through the chart's own day position. A date no row holds is not drawn,
 * though the page still lists it.
 */
export function milestoneMarkers(run: ProjectionRun): LineMarker[] {
	const view = milestoneView(run)
	if (view === null) return []
	const spans = annualRowsOf(run)
	return view.reached.flatMap((milestone) => {
		const x = dayPosition(spans, milestone.date)
		return x === null ? [] : [{ x, label: milestone.id }]
	})
}

/** The projection Read of one Scenario, when the Snapshot holds it. */
export function projectionRead(
	state: SnapshotState,
	name: string,
): Read<ProjectionRun> | undefined {
	return state.status === "ready" ? state.snapshot.reads.projections[name] : undefined
}

/** Whether a projection Read carries a milestones table. The navigation lists the page only when it does. */
export function hasMilestones(read: Read<ProjectionRun> | undefined): boolean {
	return read?.ok === true && milestoneRowsOf(read.data) !== null
}
