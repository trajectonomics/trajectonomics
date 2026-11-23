import type { DateString, Scenario } from "../types"
import type { DateOutcome } from "./day-totals"

export type { DateOutcome, DayTotals, EngineRunsOut } from "./day-totals"

import { aggregate } from "./aggregate"
import { applyAssets, applyDebt } from "./contributions"
import { dayLines, withLines } from "./day-lines"
import { plannedAmounts } from "./derive"
import type { DatedEvent } from "./events"
import { type LevySet, settlementOn, settlementPeriodViews } from "./levy-set"
import { mergeFunded, tally, totalsOf } from "./levy-step"
import { plannedFail } from "./planned-fail"
import { applyPlannedWithdrawals } from "./planned-withdrawals"
import { route } from "./route"
import type { StateMap } from "./state"

/** Applies one occurrence date in the canonical order of operations. */
export function processDate(
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	events: readonly DatedEvent[],
	levies: LevySet | undefined,
	breakdown = false,
): DateOutcome {
	const planned = plannedAmounts(events, scenario.flows, date, scenario.economy.inflation)
	if (!planned.ok) return plannedFail(date, planned.problem)
	const views = levies === undefined ? [] : settlementPeriodViews(levies, date)
	const day = aggregate(events, planned.planned, views, date)
	const settlement =
		levies === undefined
			? { amount: 0n, byLevy: new Map<string, bigint>(), problem: undefined }
			: settlementOn(levies, states, date)
	if (day.problem !== undefined) {
		return {
			totals: totalsOf(date, day, 0n, new Map(), new Map(), settlement),
			problem: day.problem,
			runsOut: undefined,
		}
	}
	const borrowing = applyPlannedWithdrawals(states, day.plannedBySource, date, levies)
	if (borrowing !== undefined) {
		return {
			totals: totalsOf(date, day, 0n, new Map(), new Map(), settlement),
			problem: borrowing,
			runsOut: undefined,
		}
	}
	const debt = applyDebt(states, day.contributionEntries, date, levies)
	if (debt.problem !== undefined) {
		tally(levies, date, day.gross, debt.funded, day.prepaidByLevy)
		const totals = totalsOf(date, day, debt.paid, debt.paidBy, new Map(), settlement)
		return { totals, problem: debt.problem, runsOut: undefined }
	}
	const cashflow = day.income - day.prepaid - day.expense - debt.paid - settlement.amount
	const available = cashflow > 0n ? cashflow : 0n
	const assets = applyAssets(
		states,
		scenario.cashflow.contribute,
		day.contributionEntries,
		available,
		date,
		levies,
	)
	tally(levies, date, day.gross, mergeFunded(debt.funded, assets.funded), day.prepaidByLevy)
	const totals = totalsOf(
		date,
		day,
		debt.paid + assets.applied,
		debt.paidBy,
		assets.unfunded,
		settlement,
	)
	if (settlement.problem !== undefined)
		return { totals, problem: settlement.problem, runsOut: undefined }
	if (assets.problem !== undefined) return { totals, problem: assets.problem, runsOut: undefined }
	const lines = breakdown
		? dayLines({
				scenario,
				states,
				events,
				planned: planned.planned,
				day,
				settled: settlement.byLevy,
				paidBy: debt.paidBy,
				unfunded: assets.unfunded,
			})
		: undefined
	// Planned-withdrawal cash joins the net that pays a Shortfall or lands as surplus, never Available cashflow.
	return route(
		states,
		scenario,
		date,
		withLines(totals, lines),
		cashflow + day.withdrawals - assets.applied,
		levies,
	)
}
