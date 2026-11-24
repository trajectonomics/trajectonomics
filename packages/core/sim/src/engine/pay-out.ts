import type { AccountId, DateString, Scenario } from "../types"
import type { DayFlows } from "./aggregate"
import { applyAssets, applyDebt, type DebtResult } from "./contributions"
import { dayLines, withLines } from "./day-lines"
import type { Planned } from "./derive"
import type { DatedEvent } from "./events"
import type { LevySet, Settlement } from "./levy-set"
import { mergeFunded, tally, totalsOf } from "./levy-step"
import { applyObligations, type ObligationResult } from "./obligations"
import type { DateOutcome } from "./occurrence"
import { route } from "./route"
import type { StateMap } from "./state"
import { applyTransfers, withTransfers } from "./transfers"

/** What one date's payments read: the run's states, the date and the Flows that landed on it. */
export interface DatedRun {
	readonly scenario: Scenario
	readonly states: StateMap
	readonly date: DateString
	readonly events: readonly DatedEvent[]
	readonly levies: LevySet | undefined
	readonly breakdown: boolean
	/** The funded Tally labels of the employer shares that landed on the date (ADR 0026). */
	readonly employerFunded: ReadonlyMap<string, bigint>
}

interface Paid {
	readonly debt: DebtResult
	readonly obligations: ObligationResult
}

function ends(run: DatedRun, day: DayFlows, paid: Paid, settlement: Settlement): DateOutcome {
	const problem = paid.debt.problem ?? paid.obligations.problem
	const { date, levies } = run
	const funded = mergeFunded(paid.debt.funded, paid.obligations.funded, run.employerFunded)
	tally(levies, date, day.gross, funded, day.prepaidByLevy)
	const contributions = paid.debt.paid + paid.obligations.paid
	const totals = totalsOf(date, day, contributions, paid.debt.paidBy, new Map(), settlement)
	return { totals, problem, runsOut: undefined }
}

/**
 * Pays the date's debt, then its obligations, from what the Flows landed; asset targets take what
 * is left of Available cashflow, and the net routes to surplus, the withdrawal list or a Shortfall.
 * Cash from a planned withdrawal (a loan or a sale) is in the net, never in Available cashflow.
 */
export function payOut(
	run: DatedRun,
	planned: Planned,
	day: DayFlows,
	sold: ReadonlyMap<AccountId, bigint>,
	settlement: Settlement,
): DateOutcome {
	const { scenario, states, date, events, levies } = run
	const debt = applyDebt(states, day.contributionEntries, date, levies)
	const obligations: ObligationResult =
		debt.problem === undefined
			? applyObligations(states, day.contributionEntries, date, levies)
			: { paid: 0n, funded: new Map(), problem: undefined }
	const paid = { debt, obligations }
	if (debt.problem !== undefined || obligations.problem !== undefined) {
		return ends(run, day, paid, settlement)
	}
	const cashflow =
		day.income - day.prepaid - day.expense - debt.paid - obligations.paid - settlement.amount
	const available = cashflow > 0n ? cashflow : 0n
	const { contribute } = scenario.cashflow
	const assets = applyAssets(states, contribute, day.contributionEntries, available, date, levies)
	const funded = mergeFunded(debt.funded, obligations.funded, assets.funded, run.employerFunded)
	tally(levies, date, day.gross, funded, day.prepaidByLevy)
	const contributions = debt.paid + obligations.paid + assets.applied
	const totals = totalsOf(date, day, contributions, debt.paidBy, assets.unfunded, settlement)
	const problem = settlement.problem ?? assets.problem
	if (problem !== undefined) return { totals, problem, runsOut: undefined }
	// Transfers land after the contributions and before the routing, outside the net (ADR 0031).
	const moved = applyTransfers(states, scenario, day.transfers, date, levies)
	const booked = withTransfers(totals, moved)
	if (moved.problem !== undefined) {
		return { totals: booked, problem: moved.problem, runsOut: undefined }
	}
	const lines = run.breakdown
		? dayLines({
				scenario,
				states,
				events,
				planned,
				day,
				settled: settlement.byLevy,
				paidBy: debt.paidBy,
				unfunded: assets.unfunded,
				sold,
				moved,
			})
		: undefined
	// Planned-withdrawal cash joins the net that pays a Shortfall or lands as surplus, never Available cashflow.
	const net = cashflow + day.withdrawals - assets.applied
	return route(states, scenario, date, withLines(booked, lines), net, levies)
}
