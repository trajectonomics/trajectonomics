import {
	type ProjectionAllowances,
	projectionAllowances,
	type Read,
	type SnapshotReads,
} from "../src/lib/contract"
import { hasLevy, type StageTwoPlan } from "../src/lib/snapshot"
import { isFilerPlan } from "../src/lib/snapshot/allowance-params"
import { runPlanned } from "./run-planned"
import type { RunContext } from "./run-traj"

/**
 * The allowance reads of the plans whose document holds a Levy, one at a time; the CLI refuses a plan with none.
 * A plan with Filers is skipped: each of its Levies reads its own labels (`@me`), while the Snapshot's inputs are
 * bare, so the CLI would refuse them (cli ADR-0075). A per-Return allowance read is a later step.
 */
export async function runAllowances(
	context: RunContext,
	plan: StageTwoPlan,
	documents: SnapshotReads["documents"],
	records: readonly unknown[],
): Promise<Record<string, Read<ProjectionAllowances>>> {
	const reads: Record<string, Read<ProjectionAllowances>> = {}
	for (const [name, planned] of Object.entries(plan.allowances)) {
		const shown = documents[name]
		if (shown?.ok !== true) continue
		if (!hasLevy(shown) || isFilerPlan(shown.data.scenario.document)) continue
		reads[name] = await runPlanned(context, planned, projectionAllowances, records)
	}
	return reads
}
