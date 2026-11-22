import type { ResolvedCalendar } from "../calendar/business"
import { occurrences } from "../calendar/occurrence"
import { movedOnceStarts } from "../milestone/spec"
import type { DateString, Flow, Scenario, Timeline } from "../types"
import { isFixed } from "../types"
import { fixedAmountAt } from "./amount"
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

/** All flow Occurrences in the timeline, on their Landed dates, sorted by date then flow id. */
export function buildEvents(
	scenario: Scenario,
	timeline: Timeline,
	calendar: ResolvedCalendar | undefined,
): readonly DatedEvent[] {
	const events: DatedEvent[] = []
	const moved = movedOnceStarts(scenario, calendar)
	for (const flow of scenario.flows) {
		const shifted = moved.get(flow.id)
		const found = occurrences(
			shifted ?? flow.start,
			flow.frequency,
			flow.end,
			timeline.start,
			timeline.horizon,
			calendar,
		)
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
	return events.sort((left, right) =>
		left.date === right.date
			? compareIds(left.flow.id, right.flow.id)
			: left.date < right.date
				? -1
				: 1,
	)
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
