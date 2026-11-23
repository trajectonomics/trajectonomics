import type { ProjectionChance, ProjectionRun, Snapshot } from "../../contract"

/** The plan's own projection in the Snapshot, or null when the Snapshot holds none or its read failed. */
export function baselineRun(snapshot: Snapshot, plan: string): ProjectionRun | null {
	const read = Object.hasOwn(snapshot.reads.projections, plan)
		? snapshot.reads.projections[plan]
		: undefined
	return read?.ok === true ? read.data : null
}

/** The plan's own chance of success in the Snapshot, or null when it holds none. */
export function baselineChance(snapshot: Snapshot, plan: string): ProjectionChance | null {
	const read = Object.hasOwn(snapshot.reads.chance, plan) ? snapshot.reads.chance[plan] : undefined
	return read?.ok === true ? read.data : null
}
