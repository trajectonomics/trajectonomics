import type { Fixture } from "../fixtures/fixture"
import type { AccountId, DateString } from "../types"
import { oracleAssetContributions, oracleDebtPayments } from "./oracle-contributions"
import type { OracleEvent } from "./oracle-flow"
import { oracleSurplus, oracleWithdraw } from "./oracle-ops"
import type { PlannedDay } from "./oracle-planned"
import {
	oracleMoveSources,
	oracleObligations,
	oraclePayObligations,
	oraclePlannedSources,
} from "./oracle-sale"
import type { OracleStates } from "./oracle-state"

/** What one day's landed Flows were worth, and whether the money ran out paying them. */
export interface OracleLanded {
	readonly expense: bigint
	readonly ranOut: boolean
}

/** The day's planned income, expense and contributions per target, one total per Flow. */
function plannedSums(landing: readonly OracleEvent[], planned: PlannedDay) {
	let income = 0n
	let expense = 0n
	const contributions = new Map<AccountId, bigint>()
	const flows = new Map(landing.map((event) => [event.flow.id, event.flow]))
	for (const [id, flow] of flows) {
		const total = planned.get(id) ?? 0n
		if (flow.kind === "income") income += total
		if (flow.kind === "expense") expense += total
		if (flow.kind === "contribution" && flow.funding !== "obligation") {
			contributions.set(flow.target, (contributions.get(flow.target) ?? 0n) + total)
		}
	}
	return { income, expense, contributions }
}

/**
 * Lands one day's Flows on the states in the engine's order: planned withdrawals (a loan draw or a
 * sale), debt payments, obligations paid in full, asset contributions from what the day's income
 * leaves, then the surplus or the withdrawal. Cash a planned withdrawal brings never counts toward
 * what the income leaves. Planned amounts are
 * already priced, so a Derived amount has read whatever it reads before any of this happens.
 */
export function oracleLandDay(
	states: OracleStates,
	fixture: Fixture,
	date: DateString,
	landing: readonly OracleEvent[],
	planned: PlannedDay,
): OracleLanded {
	const { income, expense, contributions } = plannedSums(landing, planned)
	const { scenario } = fixture
	const cash = oracleMoveSources(states, oraclePlannedSources(landing, planned), date)
	const debt = oracleDebtPayments(states, contributions, date)
	const owed = oraclePayObligations(states, oracleObligations(landing, planned), date)
	const cashflow = income - expense - debt - owed
	const budget = cashflow > 0n ? cashflow : 0n
	const assets = oracleAssetContributions(states, scenario, contributions, budget, date)
	const net = cashflow + cash - assets.applied
	if (net > 0n) oracleSurplus(states, scenario.cashflow.surplus, date, net)
	const unmet = net < 0n ? oracleWithdraw(states, scenario, date, -net) : 0n
	return { expense, ranOut: unmet > 0n }
}
