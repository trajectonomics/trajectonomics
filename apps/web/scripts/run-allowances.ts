import {
	type ProjectionAllowances,
	projectionAllowances,
	type Read,
	type SnapshotReads,
} from "../src/lib/contract"
import { hasLevy, type StageTwoPlan } from "../src/lib/snapshot"
import { runPlanned } from "./run-planned"
import type { RunContext } from "./run-traj"

/** The allowance reads of the plans whose document holds a Levy, one at a time; the CLI refuses a plan with none. */
export async function runAllowances(
	context: RunContext,
	plan: StageTwoPlan,
	documents: SnapshotReads["documents"],
	records: readonly unknown[],
): Promise<Record<string, Read<ProjectionAllowances>>> {
	const reads: Record<string, Read<ProjectionAllowances>> = {}
	for (const [name, planned] of Object.entries(plan.allowances)) {
		if (!hasLevy(documents[name])) continue
		reads[name] = await runPlanned(context, planned, projectionAllowances, records)
	}
	return reads
}
