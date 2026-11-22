import type { z } from "zod"
import {
	accountList,
	balance,
	baseline,
	doctor,
	fi,
	netWorth,
	pnl,
	projectionCompare,
	projectionRun,
	type Read,
	type SnapshotReads,
	scenarioList,
	txList,
} from "../src/lib/contract"
import {
	carryInFor,
	type PlannedRead,
	type PlanParams,
	planStageOne,
	type StageOneReads,
	type StageTwoPlan,
} from "../src/lib/snapshot"
import { type RunContext, runTraj } from "./run-traj"

/** One planned read, run with its schema, taking the Carry-in records its Scenarios name. */
export async function runPlanned<T>(
	context: RunContext,
	planned: PlannedRead,
	schema: z.ZodType<T>,
	records: readonly unknown[],
): Promise<Read<T>> {
	const stdin =
		planned.carryInFor.length > 0
			? JSON.stringify(carryInFor(records, planned.carryInFor))
			: undefined
	return runTraj(context, [...planned.argv], schema, stdin)
}

/** Runs each item in order, one at a time, so the ledger is read in a fixed sequence. */
async function sequential<T, R>(items: readonly T[], run: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = []
	for (const item of items) out.push(await run(item))
	return out
}

/** Runs every planned read of a keyed plan, keeping the same keys. */
async function recordOf<T>(
	plans: Record<string, PlannedRead>,
	run: (planned: PlannedRead) => Promise<T>,
): Promise<Record<string, T>> {
	const entries = await sequential(
		Object.entries(plans),
		async ([key, planned]) => [key, await run(planned)] as const,
	)
	return Object.fromEntries(entries)
}

/** Stage one: the Scenarios, the accounts and net worth at the As-of. */
export async function runStageOne(context: RunContext, params: PlanParams): Promise<StageOneReads> {
	const plan = planStageOne(params)
	return {
		scenarios: await runPlanned(context, plan.scenarios, scenarioList, []),
		accounts: await runPlanned(context, plan.accounts, accountList, []),
		netWorth: await runPlanned(context, plan.netWorth, netWorth, []),
	}
}

/** Stage two: every other read, planned from the Scenarios and the first transaction date. */
export async function runStageTwo(
	context: RunContext,
	plan: StageTwoPlan,
	records: readonly unknown[],
): Promise<Omit<SnapshotReads, "accounts" | "netWorth" | "scenarios">> {
	return {
		doctor: await runPlanned(context, plan.doctor, doctor, records),
		balance: await runPlanned(context, plan.balance, balance, records),
		pnl: await runPlanned(context, plan.pnl, pnl, records),
		transactions: await runPlanned(context, plan.transactions, txList, records),
		baseline: await runPlanned(context, plan.baseline, baseline, records),
		netWorthHistory: await sequential(plan.netWorthHistory, (planned) =>
			runPlanned(context, planned, netWorth, records),
		),
		projections: await recordOf(plan.projections, (planned) =>
			runPlanned(context, planned, projectionRun, records),
		),
		fi: await recordOf(plan.fi, (planned) => runPlanned(context, planned, fi, records)),
		compare:
			plan.compare === null
				? null
				: await runPlanned(context, plan.compare, projectionCompare, records),
	}
}
