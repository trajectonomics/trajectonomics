import type { DateString, Scenario } from "../types"
import { readerAt } from "./account-values"
import { type PlannedOutcome, plannedAmounts } from "./derive"
import type { DatedEvent } from "./events"
import type { RuleBook } from "./rule-book"
import { inflationOf } from "./run-scenario"
import type { StateMap } from "./state"

/** One Landed date's planned amounts in a run, reading each Account from the run's own states (ADR 0020). */
export function plannedOn(
	events: readonly DatedEvent[],
	scenario: Scenario,
	date: DateString,
	states: StateMap,
	rules?: RuleBook,
): PlannedOutcome {
	return plannedAmounts(
		events,
		scenario.flows,
		date,
		inflationOf(scenario),
		readerAt(states, date),
		rules,
	)
}
