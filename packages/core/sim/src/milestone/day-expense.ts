import { readerAhead } from "../engine/account-values"
import { plannedAmounts } from "../engine/derive"
import type { DatedEvent } from "../engine/events"
import { occurrenceAmount } from "../engine/occurrence-amount"
import type { StateMap } from "../engine/state"
import type { DateString } from "../types"
import { type DayExpense, keep, pricedFrom } from "./expense-cache"
import type { PlanView } from "./expenses"

/** The planned expense of one Landed date's events, or `undefined` when a planned amount fails. */
function expenseOn(
	events: readonly DatedEvent[],
	day: DateString,
	plan: PlanView,
	states: StateMap,
): bigint | undefined {
	const planned = plannedAmounts(events, plan.flows, day, plan.inflation, readerAhead(states, day))
	if (!planned.ok) return undefined
	let amount = 0n
	for (const event of events) {
		if (event.flow.kind !== "expense") continue
		amount += occurrenceAmount(event, planned.planned)
	}
	return amount
}

/** The planned expense of one Landed date's landing events, read from the plan's cache when it holds it. */
export function dayExpense(
	landing: readonly DatedEvent[],
	day: DateString,
	plan: PlanView,
	states: StateMap,
): DayExpense {
	const kept = pricedFrom(plan.cache?.get(day), landing)
	if (kept !== undefined) return kept
	const entry: DayExpense = { landing, amount: expenseOn(landing, day, plan, states) }
	if (plan.cache !== undefined) keep(plan.cache, day, entry)
	return entry
}
