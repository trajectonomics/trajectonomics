import type { ErrorBody, Snapshot } from "../src/lib/contract"
import {
	assembleSnapshot,
	type PlanParams,
	planStageTwo,
	type StageOneReads,
} from "../src/lib/snapshot"
import { runStageOne, runStageTwo } from "./run-stages"
import type { RunContext } from "./run-traj"

/** The outcome of a run: the Snapshot, or the first error that stops it (a failed stage one). */
export type SnapshotRun = { ok: true; snapshot: Snapshot } | { ok: false; error: ErrorBody }

/** The first failed read of stage one, whose error stops the run; null when all three hold. */
function firstStageOneFailure(one: StageOneReads): ErrorBody | null {
	for (const read of [one.scenarios, one.accounts, one.netWorth]) {
		if (!read.ok) return read.error
	}
	return null
}

/**
 * Runs the Plan against a `traj` binary and assembles the Snapshot. Stage one is the only stage whose
 * failure stops the run; a failed later read stays in the Snapshot as its error envelope.
 */
export async function runSnapshot(
	context: RunContext,
	cliVersion: string,
	params: PlanParams,
	records: readonly unknown[] = [],
): Promise<SnapshotRun> {
	const one = await runStageOne(context, params)
	const failure = firstStageOneFailure(one)
	if (failure !== null) return { ok: false, error: failure }
	const plan = planStageTwo(params, one)
	const two = await runStageTwo(context, plan, records)
	const snapshot = assembleSnapshot({
		params,
		scenarios: plan.scenarios,
		historyDates: plan.historyDates,
		cliVersion,
		reads: { ...two, accounts: one.accounts, netWorth: one.netWorth, scenarios: one.scenarios },
	})
	return { ok: true, snapshot }
}
