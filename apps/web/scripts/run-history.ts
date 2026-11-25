import { type NetWorth, netWorthMonthly, type Read } from "../src/lib/contract"
import { historyReads, type StageTwoPlan } from "../src/lib/snapshot"
import { runPlanned } from "./run-planned"
import type { RunContext } from "./run-traj"

/** The net worth history: one monthly read of every month-end, kept as one Read per month-end. */
export async function runHistory(
	context: RunContext,
	plan: StageTwoPlan,
	records: readonly unknown[],
): Promise<Read<NetWorth>[]> {
	if (plan.netWorthHistory === null) return []
	const monthly = await runPlanned(context, plan.netWorthHistory, netWorthMonthly, records)
	return historyReads(plan.historyDates, monthly)
}
