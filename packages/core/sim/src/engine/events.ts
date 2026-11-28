import type { ResolvedCalendar } from "../calendar/business"
import type { Inflation } from "../money/inflation"
import type { DateString, Scenario, Timeline } from "../types"
import { isFixed } from "../types"
import { fixedAmountAt } from "./amount"
import { type DatedOccurrence, occurrenceDates, spanKey } from "./occurrence-dates"
import { inflationOf, type RunScenario } from "./run-scenario"

/** A Flow's Occurrence on its Landed date, with its amount grown by the inflation one run follows. */
export type DatedEvent = DatedOccurrence

interface Kept {
	readonly dates: readonly DatedOccurrence[]
	readonly full?: readonly DatedEvent[]
}

const built: WeakMap<Scenario, Map<string, Kept>> = new WeakMap()

/** The events with every fixed Flow's amount grown once, instead of per candidate on each date. */
function withAmounts(
	events: readonly DatedOccurrence[],
	inflation: Inflation,
): readonly DatedEvent[] {
	return Object.freeze(
		events.map((event) =>
			event.amount !== undefined || !isFixed(event.flow)
				? event
				: { ...event, amount: fixedAmountAt(event.flow, event.years, inflation, event.date) },
		),
	)
}

/**
 * All flow Occurrences in the timeline, on their Landed dates, sorted by date then flow id. The
 * `calendar` is the Scenario's own. Occurrence dates are cached on the declared Scenario, so every
 * Market path of a chance run shares them; only a fixed Flow's grown amount is built again for the
 * `inflation` its run follows (the price path), unless that is the Scenario's own rate.
 */
export function buildEvents(
	scenario: RunScenario,
	timeline: Timeline,
	calendar: ResolvedCalendar | undefined,
	inflation: Inflation = inflationOf(scenario),
): readonly DatedEvent[] {
	const bySpan = built.get(scenario) ?? new Map<string, Kept>()
	built.set(scenario, bySpan)
	const key = spanKey(timeline, calendar)
	const kept = bySpan.get(key) ?? { dates: occurrenceDates(scenario, timeline, calendar) }
	bySpan.set(key, kept)
	const declared = typeof inflation === "number" && inflation === scenario.economy.inflation
	if (declared && kept.full !== undefined) return kept.full
	const events = withAmounts(kept.dates, inflation)
	if (declared) bySpan.set(key, { dates: kept.dates, full: events })
	return events
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
