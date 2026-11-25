import type { ResolvedCalendar } from "../calendar/business"
import { feeEvents } from "../fee/flows"
import { resolveLoan } from "../loan/resolve"
import { movedOnceStarts } from "../milestone/spec"
import type { DateString, Flow, Scenario, Timeline } from "../types"
import { isFixed } from "../types"
import { fixedAmountAt } from "./amount"
import { flowOccurrences } from "./flow-occurrences"
import { compareIds } from "./order"

export interface DatedEvent {
	readonly date: DateString
	readonly flow: Flow
	readonly years: number
	/** The grown amount, when the scan computed it once per event instead of per candidate. */
	readonly amount?: bigint
	/** Lands on a static Milestone's fire date rather than its recurrence, so it is no evaluation date. */
	readonly deferred?: boolean
}

const built: WeakMap<Scenario, Map<string, readonly DatedEvent[]>> = new WeakMap()

/**
 * All flow Occurrences in the timeline, on their Landed dates, sorted by date then flow id. The
 * `calendar` is the Scenario's own, so every run of a Scenario over one span shares its events, as
 * its Market paths and FI candidates do.
 */
export function buildEvents(
	scenario: Scenario,
	timeline: Timeline,
	calendar: ResolvedCalendar | undefined,
): readonly DatedEvent[] {
	const bySpan = built.get(scenario) ?? new Map<string, readonly DatedEvent[]>()
	built.set(scenario, bySpan)
	const key = `${timeline.start}|${timeline.horizon}|${calendar === undefined}`
	const kept = bySpan.get(key)
	if (kept !== undefined) return kept
	const events = eventsOf(scenario, timeline, calendar)
	bySpan.set(key, events)
	return events
}

function eventsOf(
	scenario: Scenario,
	timeline: Timeline,
	calendar: ResolvedCalendar | undefined,
): readonly DatedEvent[] {
	const events: DatedEvent[] = []
	const moved = movedOnceStarts(scenario, calendar)
	for (const declared of scenario.flows) {
		const flow = resolveLoan(declared, scenario.accounts)
		const shifted = moved.get(flow.id)
		const found = flowOccurrences(flow, shifted, timeline, calendar)
		for (const occurrence of found) {
			const event = {
				date: occurrence.date,
				flow,
				years: occurrence.years,
				...(shifted === undefined ? {} : { deferred: true }),
			}
			events.push(
				isFixed(flow)
					? { ...event, amount: fixedAmountAt(flow, occurrence.years, scenario.economy.inflation) }
					: event,
			)
		}
	}
	events.push(...feeEvents(scenario, timeline, calendar))
	events.sort((left, right) =>
		left.date === right.date
			? compareIds(left.flow.id, right.flow.id)
			: left.date < right.date
				? -1
				: 1,
	)
	// Shared by every run of the Scenario over the span, so it is kept as built.
	return Object.freeze(events)
}

/** The slice of events sharing `date`, starting at `index`, and the index just past them. */
export function flowsAt(
	events: readonly DatedEvent[],
	index: number,
	date: DateString,
): readonly [number, readonly DatedEvent[]] {
	let next = index
	while (next < events.length && events[next]?.date === date) next++
	return [next, events.slice(index, next)]
}
