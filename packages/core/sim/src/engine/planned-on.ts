import type { BasisPoints, DateString, Flow, Scenario } from "../types"
import { type AccountValues, readerAt, readerOn } from "./account-values"
import { type PlannedOutcome, plannedAmounts } from "./derive"
import type { DatedEvent } from "./events"
import type { StateMap } from "./state"

/** One Landed date's planned amounts in a run, reading each Account from the run's own states (ADR 0020). */
export function plannedOn(
	events: readonly DatedEvent[],
	scenario: Scenario,
	date: DateString,
	states: StateMap,
): PlannedOutcome {
	return plannedAmounts(
		events,
		scenario.flows,
		date,
		scenario.economy.inflation,
		readerAt(states, date),
	)
}

/** One Landed date's planned amounts of a plan, reading each Account from its unchanged values (ADR 0020). */
export function plannedWith(
	events: readonly DatedEvent[],
	flows: readonly Flow[],
	inflation: BasisPoints,
	date: DateString,
	values: AccountValues,
): PlannedOutcome {
	return plannedAmounts(events, flows, date, inflation, readerOn(values, date))
}
