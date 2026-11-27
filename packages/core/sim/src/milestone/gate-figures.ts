import { addDays } from "../calendar/arith"
import type { DatedEvent } from "../engine/events"
import { inflationOf } from "../engine/run-scenario"
import type { AccountState, StateMap } from "../engine/state"
import { valuation } from "../engine/value"
import type { DateString, MilestoneTerms, ReferenceWindow, Scenario, Timeline } from "../types"
import type { ExpenseCache } from "./expense-cache"
import { type PlanView, type TrailEntry, trailingExpenses } from "./expenses"
import { type Figures, termed } from "./metrics"
import { plannedExpenses } from "./planned-expenses"

/** The plan an expense window reads, for one run or candidate. */
export function planViewOf(
	scenario: Scenario,
	timeline: Timeline,
	events: readonly DatedEvent[],
	cache?: ExpenseCache,
): PlanView {
	return {
		...(cache === undefined ? {} : { cache }),
		events,
		flows: scenario.flows,
		pastHorizon: addDays(timeline.horizon, 1),
		start: timeline.start,
		inflation: inflationOf(scenario),
	}
}

/** The figures a Metric reads on `date`: the states as they stand and the windows as they stand. */
export function figuresOf(
	view: PlanView,
	trail: readonly TrailEntry[],
	fires: ReadonlyMap<string, DateString>,
	states: StateMap,
	date: DateString,
): Figures {
	const read = new Map<number, bigint | undefined>()
	const expenses = (window: ReferenceWindow, terms: MilestoneTerms): bigint | undefined =>
		window === "trailing12Months"
			? trailingExpenses(trail, date, view, terms)
			: plannedExpenses(view, fires, date, terms, states)
	const worth = new Map<AccountState, bigint>()
	const real = new Map<AccountState, bigint>()
	const account = (state: AccountState, terms: MilestoneTerms): bigint => {
		const kept = terms === "real" ? real : worth
		let value = kept.get(state)
		if (value === undefined) {
			value = termed(valuation(state, date), date, view.start, view.inflation, terms)
			kept.set(state, value)
		}
		return value
	}
	return {
		date,
		states,
		account,
		start: view.start,
		inflation: view.inflation,
		// Every Milestone that reads a window reads the same figure until another one fires on the
		// date (a fire counts for the next, ADR 0012), and `fires` only grows, so its size keys the read.
		expenses: (window, terms) => {
			const key =
				(window === "trailing12Months" ? 2 : 0) + (terms === "real" ? 1 : 0) + 4 * fires.size
			if (!read.has(key)) read.set(key, expenses(window, terms))
			return read.get(key)
		},
	}
}
