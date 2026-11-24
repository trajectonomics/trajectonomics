import type { Fixture } from "../fixtures/fixture"
import type { AccountId, DateString } from "../types"
import { oracleAssetContributions, oracleDebtPayments } from "./oracle-contributions"
import type { OracleEvent } from "./oracle-flow"
import { oracleSurplus, oracleWithdraw } from "./oracle-ops"
import type { PlannedDay } from "./oracle-planned"
import {
	oracleLandEmployer,
	oracleMoveSources,
	oracleObligations,
	oraclePayObligations,
	oraclePlannedSources,
} from "./oracle-sale"
import type { OracleStates } from "./oracle-state"
import { type OracleMoved, oracleTransfers } from "./oracle-transfer"

/** What one day's landed Flows were worth, and whether the money ran out paying them. */
export interface OracleLanded extends OracleMoved {
	readonly expense: bigint
	readonly ranOut: boolean
}

/** A Contribution that spends Available cashflow: an obligation and an employer share do not. */
function isTarget(
	flow: OracleEvent["flow"],
): flow is Extract<OracleEvent["flow"], { kind: "contribution" }> {
	return flow.kind === "contribution" && (flow.funding ?? "target") === "target"
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
		if (isTarget(flow)) {
			contributions.set(flow.target, (contributions.get(flow.target) ?? 0n) + total)
		}
	}
	return { income, expense, contributions }
}

/** The expense a day's landing plans, for a day priced from the states a run-out left (ADR 0013). */
export function oraclePlannedExpense(landing: readonly OracleEvent[], planned: PlannedDay): bigint {
	return plannedSums(landing, planned).expense
}

/**
 * Lands one day's Flows on the states in the engine's order: employer shares (outside cash), planned withdrawals (a loan draw or a
 * sale), debt payments, obligations paid in full, asset contributions from what the day's income
 * leaves, then the transfers (outside cash, so the net is the same), then the surplus or the withdrawal. Cash a planned withdrawal brings never counts toward
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
	oracleLandEmployer(states, landing, planned, date)
	const cash = oracleMoveSources(states, oraclePlannedSources(landing, planned), date)
	const debt = oracleDebtPayments(states, contributions, date)
	const owed = oraclePayObligations(states, oracleObligations(landing, planned), date)
	const cashflow = income - expense - debt - owed
	const budget = cashflow > 0n ? cashflow : 0n
	const assets = oracleAssetContributions(states, scenario, contributions, budget, date)
	const moves = oracleTransfers(states, landing, planned, date)
	const net = cashflow + cash - assets.applied
	if (net > 0n) oracleSurplus(states, scenario, fixture.timeline.start, date, net)
	const unmet = net < 0n ? oracleWithdraw(states, scenario, fixture.timeline.start, date, -net) : 0n
	return { expense, ranOut: unmet > 0n, ...moves }
}
