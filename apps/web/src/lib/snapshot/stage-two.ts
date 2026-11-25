import type { Read } from "../contract"
import { firstDayOfYear, firstDayTwoMonthsBack, monthEndsBetween } from "./dates"
import { planHistory } from "./history"
import type { PlanParams } from "./params"
import { pathRead } from "./paths"
import { type PlannedRead, plainRead } from "./planned"
import type { StageOneReads } from "./stage-one"
import { planAllowances } from "./stage-two-allowances"
import {
	planChance,
	planCompare,
	planDocuments,
	planFi,
	planProjections,
} from "./stage-two-projections"

/** The argv of stage two, the reads that depend on the Scenarios and the first transaction date. */
export type StageTwoPlan = {
	/** The Scenario names projected, in the order the ledger lists them. */
	scenarios: string[]
	/** The month-ends of the net worth history, oldest first; the Snapshot holds one net worth Read per date. */
	historyDates: string[]
	doctor: PlannedRead
	balance: PlannedRead
	pnl: PlannedRead
	transactions: PlannedRead
	baseline: PlannedRead
	/** The one `report networth --monthly` read of every month-end in `historyDates`; null when there is none. */
	netWorthHistory: PlannedRead | null
	/** One `scenario show --decimal` per Scenario, the documents the planner pages show and edit. */
	documents: Record<string, PlannedRead>
	projections: Record<string, PlannedRead>
	fi: Record<string, PlannedRead>
	compare: PlannedRead | null
	/** One `projection chance` per Scenario; empty when the caller stated no Return model. */
	chance: Record<string, PlannedRead>
	/** Whether the five representative paths are read in advance (the offline Snapshot only, web ADR 0020). */
	readPaths: boolean
	/** The `projection path` of one Scenario and one path index of its chance run; null when the Snapshot states no chance inputs. */
	pathOf: (scenario: string, index: number) => PlannedRead | null
	/** One `projection allowances` per Scenario; empty when the Snapshot states no allowance inputs. The runner reads only plans with a Levy. */
	allowances: Record<string, PlannedRead>
}

/** The names of the Scenarios the list read holds, or none when that read failed. */
function namesOf(read: Read<{ scenarios: { name: string }[] }>): string[] {
	return read.ok ? read.data.scenarios.map((scenario) => scenario.name) : []
}

/**
 * The names with the ledger's main plan first, when it is one of them and the list read holds it. The pages show the
 * first plan unless the address names another, so the main plan is the one they open on (web ADR 0023). The rest keep their order.
 */
function mainFirst(names: string[], read: StageOneReads["scenarios"]): string[] {
	const main = read.ok ? read.data.scenarios.find((plan) => plan.main === true)?.name : undefined
	return main !== undefined && names.includes(main)
		? [main, ...names.filter((name) => name !== main)]
		: names
}

/** The first transaction date net worth reports, or null when the ledger has none. */
function firstDateOf(read: StageOneReads["netWorth"]): string | null {
	return read.ok ? read.data.firstTransactionDate : null
}

/** The argv of stage two, planned from the parameters and the results of stage one. */
export function planStageTwo(params: PlanParams, one: StageOneReads): StageTwoPlan {
	const named = params.scenarios.length > 0 ? [...params.scenarios] : namesOf(one.scenarios)
	const scenarios = mainFirst(named, one.scenarios)
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
		netWorthHistory: planHistory(historyDates),
		documents: planDocuments(scenarios),
		projections: planProjections(params, scenarios),
		fi: planFi(params, scenarios),
		compare: planCompare(params),
		chance: planChance(params, scenarios),
		readPaths: params.readPaths,
		pathOf: (scenario, index) => pathRead(params, scenario, index),
		allowances: planAllowances(params, scenarios),
	}
}
