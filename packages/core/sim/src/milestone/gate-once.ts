import { fixedAmountAt } from "../engine/amount"
import type { DatedEvent } from "../engine/events"
import type { BasisPoints, DateString, Flow } from "../types"
import { isFixed } from "../types"
import type { DeferredOnce } from "./spec"

/** A `once` Flow landing on `date`, with the amount fields `buildEvents` gives its events. */
function onceEvent(flow: Flow, date: DateString, inflation: BasisPoints): DatedEvent {
	if (isFixed(flow)) return { date, flow, years: 0, amount: fixedAmountAt(flow, 0, inflation) }
	return { date, flow, years: 0 }
}

/**
 * The deferred `once` Flows whose Milestone fired on `date` while their own start is already past:
 * they land on the fire date, which is the later of the two.
 */
export function onceEventsOn(
	deferred: readonly DeferredOnce[],
	fired: readonly string[],
	date: DateString,
	inflation: BasisPoints,
): DatedEvent[] {
	return deferred
		.filter((item) => item.landed < date && fired.includes(item.milestone))
		.map((item) => onceEvent(item.flow, date, inflation))
}
