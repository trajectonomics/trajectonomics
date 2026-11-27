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
	type PlanParams,
	planStageOne,
	type StageOneReads,
	type StageTwoPlan,
} from "../src/lib/snapshot"
import { runAllowances } from "./run-allowances"
import { runHistory } from "./run-history"
import { runPaths } from "./run-paths"
import { runPlanned } from "./run-planned"
import { createPool, recordPool, recordWithPool } from "./run-pool"
import { runTaxNotes } from "./run-tax-notes"
import type { RunContext } from "./run-traj"

/** Stage one: the Scenarios, the accounts and net worth at the As-of, read concurrently. */
export async function runStageOne(context: RunContext, params: PlanParams): Promise<StageOneReads> {
	const plan = planStageOne(params)
	const [scenarios, accounts, netWorthRead] = await Promise.all([
		runPlanned(context, plan.scenarios, scenarioList, []),
		runPlanned(context, plan.accounts, accountList, []),
		runPlanned(context, plan.netWorth, netWorth, []),
	])
	return { scenarios, accounts, netWorth: netWorthRead }
}

/** The chance reads of a plan, with bounded concurrency; none when the plan states no chance inputs. */
export function runChance(
	context: RunContext,
	plan: StageTwoPlan,
	records: readonly unknown[],
): Promise<Record<string, Read<ProjectionChance>>> {
	return recordPool(plan.chance, (p) => runPlanned(context, p, projectionChance, records))
}

/** Stage two: every other read, planned from the Scenarios and the first transaction date. */
export async function runStageTwo(
	context: RunContext,
	plan: StageTwoPlan,
	records: readonly unknown[],
): Promise<
	Omit<SnapshotReads, "accounts" | "netWorth" | "scenarios"> &
		Required<Pick<SnapshotReads, "rates">>
> {
	const pool = createPool()
	const comparePlan = plan.compare
	const phaseOne = await Promise.all([
		recordWithPool(pool, plan.documents, (p) => runPlanned(context, p, scenarioShow, records)),
		recordWithPool(pool, plan.projections, (p) => runPlanned(context, p, projectionRun, records)),
		recordWithPool(pool, plan.chance, (p) => runPlanned(context, p, projectionChance, records)),
		pool(() => runPlanned(context, plan.doctor, doctor, records)),
		pool(() => runPlanned(context, plan.balance, balance, records)),
		pool(() => runPlanned(context, plan.pnl, pnl, records)),
		pool(() => runPlanned(context, plan.transactions, txList, records)),
		pool(() => runPlanned(context, plan.baseline, baseline, records)),
		pool(() => runHistory(context, plan, records)),
		recordWithPool(pool, plan.fi, (p) => runPlanned(context, p, fi, records)),
		comparePlan === null
			? Promise.resolve(null)
			: pool(() => runPlanned(context, comparePlan, projectionCompare, records)),
		pool(() => runPlanned(context, plan.rates, baselineRates, records)),
	])
	const [documents, projections, chance] = phaseOne
	const [paths, allowances, taxNotes] = await Promise.all([
		runPaths(context, plan, chance, records, pool),
		runAllowances(context, plan, documents, projections, records, pool),
		runTaxNotes(context, plan, documents, records, pool),
	])
	return {
		doctor: phaseOne[3],
		balance: phaseOne[4],
		pnl: phaseOne[5],
		transactions: phaseOne[6],
		baseline: phaseOne[7],
		rates: phaseOne[11],
		netWorthHistory: phaseOne[8],
		documents,
		projections,
		fi: phaseOne[9],
		compare: phaseOne[10],
		chance,
		paths,
		allowances,
		taxNotes,
	}
}
