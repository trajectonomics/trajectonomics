import type { Read } from "../contract"
import { firstDayOfYear, firstDayTwoMonthsBack, monthEndsBetween } from "./dates"
import type { PlanParams } from "./params"
import { type PlannedRead, plainRead } from "./planned"
import type { StageOneReads } from "./stage-one"
import { planCompare, planFi, planProjections } from "./stage-two-projections"

/** The argv of stage two, the reads that depend on the Scenarios and the first transaction date. */
export type StageTwoPlan = {
	/** The Scenario names projected, in the order the ledger lists them. */
	scenarios: string[]
	/** The month-ends of the net worth history, oldest first; one net worth read per date. */
	historyDates: string[]
	doctor: PlannedRead
	balance: PlannedRead
	pnl: PlannedRead
	transactions: PlannedRead
	baseline: PlannedRead
	netWorthHistory: PlannedRead[]
	projections: Record<string, PlannedRead>
	fi: Record<string, PlannedRead>
	compare: PlannedRead | null
}

/** The names of the Scenarios the list read holds, or none when that read failed. */
function namesOf(read: Read<{ scenarios: { name: string }[] }>): string[] {
	return read.ok ? read.data.scenarios.map((scenario) => scenario.name) : []
}

/** The first transaction date net worth reports, or null when the ledger has none. */
function firstDateOf(read: StageOneReads["netWorth"]): string | null {
	return read.ok ? read.data.firstTransactionDate : null
}

/** The argv of stage two, planned from the parameters and the results of stage one. */
export function planStageTwo(params: PlanParams, one: StageOneReads): StageTwoPlan {
	const scenarios = params.scenarios.length > 0 ? [...params.scenarios] : namesOf(one.scenarios)
	const first = firstDateOf(one.netWorth)
	const historyDates = first === null ? [] : monthEndsBetween(first, params.asOf)
	return {
		scenarios,
		historyDates,
		doctor: plainRead(["doctor", "--as-of", params.asOf, "--json"]),
		balance: plainRead(["balance", "--as-of", params.asOf, "--trial-balance", "--json"]),
		pnl: plainRead([
			"report",
			"pnl",
			"--since",
			firstDayOfYear(params.asOf),
			"--until",
			params.asOf,
			"--json",
		]),
		transactions: plainRead([
			"tx",
			"list",
			"--since",
			firstDayTwoMonthsBack(params.asOf),
			"--until",
			params.asOf,
			"--json",
		]),
		baseline: plainRead(["baseline", "show", "--as-of", params.asOf, "--json"]),
		netWorthHistory: historyDates.map((date) =>
			plainRead(["report", "networth", "--as-of", date, "--json"]),
		),
		projections: planProjections(params, scenarios),
		fi: planFi(params, scenarios),
		compare: planCompare(params),
	}
}
