import type { DateString, Scenario } from "../types"
import type { DateOutcome } from "./day-totals"

export type { DateOutcome, DayTotals, EngineRunsOut } from "./day-totals"

import { aggregate, type DayFlows } from "./aggregate"
import { applyEmployer } from "./employer"
import type { DatedEvent } from "./events"
import { type LevySet, settlementOn, settlementPeriodViews } from "./levy-set"
import { totalsOf } from "./levy-step"
import { payOut } from "./pay-out"
import { plannedFail } from "./planned-fail"
import { plannedOn } from "./planned-on"
import { applyPlannedWithdrawals } from "./planned-withdrawals"
import type { RuleBook } from "./rule-book"
import type { StateMap } from "./state"

const NO_SETTLEMENT = { amount: 0n, byLevy: new Map<string, bigint>(), problem: undefined }

/** Applies one occurrence date in the canonical order of operations. */
export function processDate(
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	events: readonly DatedEvent[],
	levies: LevySet | undefined,
	breakdown = false,
	rules?: RuleBook,
): DateOutcome {
	const planned = plannedOn(events, scenario, date, states, rules)
	if (!planned.ok) return plannedFail(date, planned.problem)
	const views = levies === undefined ? [] : settlementPeriodViews(levies, date)
	const day = aggregate(events, planned.planned, views, date)
	const settlement = levies === undefined ? NO_SETTLEMENT : settlementOn(levies, states, date)
	const early = (flows: DayFlows, problem: NonNullable<DateOutcome["problem"]>): DateOutcome => ({
		totals: totalsOf(date, flows, 0n, new Map(), new Map(), settlement),
		problem,
		runsOut: undefined,
	})
	if (day.problem !== undefined) return early(day, day.problem)
	const moves = applyPlannedWithdrawals(states, day.plannedBySource, date, levies)
	const landed = { ...day, withdrawals: moves.cash, plannedBySource: moves.borrowedBy }
	if (moves.problem !== undefined) return early(landed, moves.problem)
	// An employer share lands in its Account first: it is outside cashflow, so nothing below reads it (ADR 0026).
	const employer = applyEmployer(states, day.contributionEntries, date, levies)
	if (employer.problem !== undefined) return early({ ...landed, employer: 0n }, employer.problem)
	const dated = {
		scenario,
		states,
		date,
		events,
		levies,
		breakdown,
		employerFunded: employer.funded,
	}
	return payOut(dated, planned.planned, landed, moves.soldBy, settlement)
}
