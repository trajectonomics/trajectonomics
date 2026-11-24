// A reread that changes only the allowance inputs or only the chance inputs: stage one is read again to see whether
// anything the Snapshot stands on moved, and when nothing did only the reads that depend on those inputs run, swapped
// into the held Snapshot.
import type { Snapshot } from "../src/lib/contract"
import type { Reread } from "../src/lib/edit/reread"
import {
	type PlanParams,
	planStageTwo,
	stillCurrent,
	withAllowances,
	withChance,
} from "../src/lib/snapshot"
import { PLAN_RETURN_MODEL } from "../src/lib/snapshot/chance-params"
import { runAllowances } from "./run-allowances"
import { runPaths } from "./run-paths"
import { runChance, runStageOne } from "./run-stages"
import type { RunContext } from "./run-traj"
import { firstStageOneFailure, runFromStageOne, type SnapshotRun } from "./snapshot-run"

/** The inputs a reread changed, so the reads that depend on them run again and no others. */
export type Changed = { allowances: boolean; chance: boolean }

/** What a reread states: the reads that depend on its inputs run again, and no others. */
export function changedBy(reread: Reread): Changed {
	return { allowances: reread.allowances !== undefined, chance: reread.chance !== undefined }
}

/**
 * The parameters a reread asks for. The inputs live with the Snapshot's parameters, so a change of them is a read and no write.
 * The paths and the seed change and the Return model stays: the file the server was given, or the plan's own.
 */
export function paramsAfter(params: PlanParams, reread: Reread): PlanParams {
	const { allowances, chance } = reread
	const model = params.chance?.returnModel ?? PLAN_RETURN_MODEL
	return {
		...params,
		...(allowances === undefined ? {} : { allowances }),
		...(chance === undefined ? {} : { chance: { returnModel: model, ...chance } }),
	}
}

/**
 * Reads the Snapshot again for new allowance or chance inputs in `params`. The three stage-one reads (the plans with
 * their content hashes, the accounts, net worth at the As-of) are read again as the check: when they equal the held
 * ones, the reads of the inputs that changed run and every other Read is kept; when they differ, the whole Plan runs
 * from them.
 */
export async function rereadInputs(
	context: RunContext,
	cliVersion: string,
	params: PlanParams,
	held: Snapshot,
	records: readonly unknown[],
	changed: Changed,
): Promise<SnapshotRun> {
	// Clearing the allowance inputs runs no read, and nothing else changed: the held Snapshot holds no allowance read.
	if (!changed.chance && params.allowances === null) {
		return { ok: true, snapshot: withAllowances(held, null, {}) }
	}
	const one = await runStageOne(context, params)
	const failure = firstStageOneFailure(one)
	if (failure !== null) return { ok: false, error: failure }
	const rerun = [
		...(changed.allowances ? ["allowances" as const] : []),
		...(changed.chance ? ["chance" as const] : []),
	]
	if (!stillCurrent(held, one, rerun))
		return runFromStageOne(context, cliVersion, params, one, records)
	const plan = planStageTwo(params, one)
	let snapshot = held
	if (changed.allowances) {
		const reads = await runAllowances(context, plan, held.reads.documents, records)
		snapshot = withAllowances(snapshot, params.allowances, reads)
	}
	if (changed.chance && params.chance !== null) {
		const chance = await runChance(context, plan, records)
		const paths = await runPaths(context, plan, chance, records)
		snapshot = withChance(snapshot, params.chance, chance, paths)
	}
	return { ok: true, snapshot }
}
