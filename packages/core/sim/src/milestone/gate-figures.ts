import type { DatedEvent } from "../engine/events"
import type { StateMap } from "../engine/state"
import type { DateString, Scenario, Timeline } from "../types"
import { type PlanView, plannedExpenses, type TrailEntry, trailingExpenses } from "./expenses"
import type { Figures } from "./metrics"

/** The plan an expense window reads, for one run or candidate. */
export function planViewOf(
	scenario: Scenario,
	timeline: Timeline,
	events: readonly DatedEvent[],
): PlanView {
	return {
		events,
		flows: scenario.flows,
		horizon: timeline.horizon,
		start: timeline.start,
		inflation: scenario.economy.inflation,
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
	return {
		date,
		states,
		start: view.start,
		inflation: view.inflation,
		expenses: (window, terms) =>
			window === "trailing12Months"
				? trailingExpenses(trail, date, view, terms)
				: plannedExpenses(view, fires, date, terms, states),
	}
}
