// A reread that changes only the allowance inputs: stage one is read again to see whether anything the Snapshot
// stands on moved, and when nothing did only the `projection allowances` reads run, swapped into the held Snapshot.
import type { Snapshot } from "../src/lib/contract"
import { type PlanParams, planStageTwo, stillCurrent, withAllowances } from "../src/lib/snapshot"
import { runAllowances } from "./run-allowances"
import { runStageOne } from "./run-stages"
import type { RunContext } from "./run-traj"
import { firstStageOneFailure, runFromStageOne, type SnapshotRun } from "./snapshot-run"

/**
 * Reads the Snapshot again for new allowance inputs in `params`. The three stage-one reads (the plans with their
 * content hashes, the accounts, net worth at the As-of) are read again as the check: when they equal the held
 * ones, the allowance reads run and every other Read is kept; when they differ, the whole Plan runs from them.
 */
export async function rereadAllowances(
	context: RunContext,
	cliVersion: string,
	params: PlanParams,
	held: Snapshot,
	records: readonly unknown[],
): Promise<SnapshotRun> {
	const one = await runStageOne(context, params)
	const failure = firstStageOneFailure(one)
	if (failure !== null) return { ok: false, error: failure }
	if (!stillCurrent(held, one)) return runFromStageOne(context, cliVersion, params, one, records)
	const plan = planStageTwo(params, one)
	const reads = await runAllowances(context, plan, held.reads.documents, records)
	return { ok: true, snapshot: withAllowances(held, params.allowances, reads) }
}
