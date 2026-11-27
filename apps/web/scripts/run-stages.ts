import {
	accountList,
	balance,
	baseline,
	baselineRates,
	doctor,
	fi,
	netWorth,
	type ProjectionChance,
	pnl,
	projectionChance,
	projectionCompare,
	projectionRun,
	type Read,
	type SnapshotReads,
	scenarioList,
	scenarioShow,
	txList,
} from "../src/lib/contract"
import {
	type PlannedRead,
	type PlanParams,
	planStageOne,
	type StageOneReads,
	type StageTwoPlan,
} from "../src/lib/snapshot"
import { runAllowances } from "./run-allowances"
import { runHistory } from "./run-history"
import { runPaths } from "./run-paths"
import { runPlanned } from "./run-planned"
import { runTaxNotes } from "./run-tax-notes"
import type { RunContext } from "./run-traj"

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

/** The chance reads of a plan, one at a time; none when the plan states no chance inputs. */
export async function runChance(
	context: RunContext,
	plan: StageTwoPlan,
	records: readonly unknown[],
): Promise<Record<string, Read<ProjectionChance>>> {
	return recordOf(plan.chance, (planned) => runPlanned(context, planned, projectionChance, records))
}

/** Stage two: every other read, planned from the Scenarios and the first transaction date. */
export async function runStageTwo(
	context: RunContext,
	plan: StageTwoPlan,
	records: readonly unknown[],
): Promise<Omit<SnapshotReads, "accounts" | "netWorth" | "scenarios">> {
	const documents = await recordOf(plan.documents, (planned) =>
		runPlanned(context, planned, scenarioShow, records),
	)
	const projections = await recordOf(plan.projections, (planned) =>
		runPlanned(context, planned, projectionRun, records),
	)
	const chance = await runChance(context, plan, records)
	return {
		doctor: await runPlanned(context, plan.doctor, doctor, records),
		balance: await runPlanned(context, plan.balance, balance, records),
		pnl: await runPlanned(context, plan.pnl, pnl, records),
		transactions: await runPlanned(context, plan.transactions, txList, records),
		baseline: await runPlanned(context, plan.baseline, baseline, records),
		rates: await runPlanned(context, plan.rates, baselineRates, records),
		netWorthHistory: await runHistory(context, plan, records),
		documents,
		projections,
		fi: await recordOf(plan.fi, (planned) => runPlanned(context, planned, fi, records)),
		compare:
			plan.compare === null
				? null
				: await runPlanned(context, plan.compare, projectionCompare, records),
		chance,
		paths: await runPaths(context, plan, chance, records),
		allowances: await runAllowances(context, plan, documents, projections, records),
		taxNotes: await runTaxNotes(context, plan, documents, records),
	}
}
