import {
	type ProjectionAllowances,
	projectionAllowances,
	type Read,
	type ScenarioDocument,
	type SnapshotReads,
} from "../src/lib/contract"
import { hasLevy, type StageTwoPlan } from "../src/lib/snapshot"
import { filersOf, readForFilers } from "../src/lib/snapshot/allowance-filers"
import { isFilerPlan } from "../src/lib/snapshot/allowance-params"
import type { PlannedRead } from "../src/lib/snapshot/planned"
import { runPlanned } from "./run-planned"
import { createPool, mapWithPool, type Pool } from "./run-pool"
import type { RunContext } from "./run-traj"

type ProjectionRead = SnapshotReads["projections"][string] | undefined

/** A projection read's data, or undefined when the read failed or the Snapshot holds none. */
function dataOf(read: ProjectionRead) {
	return read?.ok === true ? read.data : undefined
}

/**
 * The read of one plan: its own labels suffixed by each Filer when it has them, or the plan's read as it is.
 * Null when a Filer plan's Filers no read states: its bare labels would be refused (cli ADR-0075).
 */
function readOf(
	planned: PlannedRead,
	document: ScenarioDocument,
	projection: ProjectionRead,
): PlannedRead | null {
	if (!isFilerPlan(document)) return planned
	const filers = filersOf(document, dataOf(projection))
	return filers.length === 0 ? null : readForFilers(planned, filers)
}

/**
 * The allowance reads of the plans whose document holds a Levy; the CLI refuses a plan with none.
 * A plan with Filers reads each Return's own labels; a plan without them keeps its bare labels and reads as it always has.
 */
export async function runAllowances(
	context: RunContext,
	plan: StageTwoPlan,
	documents: SnapshotReads["documents"],
	projections: SnapshotReads["projections"],
	records: readonly unknown[],
	pool: Pool = createPool(),
): Promise<Record<string, Read<ProjectionAllowances>>> {
	const eligible: [string, PlannedRead][] = []
	for (const [name, planned] of Object.entries(plan.allowances)) {
		const shown = documents[name]
		if (shown?.ok !== true || !hasLevy(shown)) continue
		const read = readOf(planned, shown.data.scenario.document, projections[name])
		if (read === null) continue
		eligible.push([name, read])
	}
	const results = await mapWithPool(
		pool,
		eligible,
		async ([name, read]) =>
			[name, await runPlanned(context, read, projectionAllowances, records)] as const,
	)
	return Object.fromEntries(results)
}
