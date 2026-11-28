import type { ResolvedCalendar } from "../calendar/business"
import { feeEvents } from "../fee/flows"
import { resolveLoan } from "../loan/resolve"
import { movedOnceStarts } from "../milestone/spec"
import type { DateString, Flow, Scenario, Timeline } from "../types"
import { flowOccurrences } from "./flow-occurrences"
import { compareIds } from "./order"

/** A Flow's Occurrence on its Landed date, before any inflation-dependent amount is known. */
export interface DatedOccurrence {
	readonly date: DateString
	readonly flow: Flow
	readonly years: number
	/** The grown amount, when the scan computed it once per event instead of per candidate. */
	readonly amount?: bigint
	/** Lands on a static Milestone's fire date rather than its recurrence, so it is no evaluation date. */
	readonly deferred?: boolean
}

const occurrences: WeakMap<Scenario, Map<string, readonly DatedOccurrence[]>> = new WeakMap()
const runs: WeakMap<Scenario, number> = new WeakMap()

/** The span's cache key: its start and horizon, and whether a business Calendar applies. */
export function spanKey(timeline: Timeline, calendar: ResolvedCalendar | undefined): string {
	return `${timeline.start}|${timeline.horizon}|${calendar === undefined}`
}

/** Test-only: how many times this Scenario's Occurrence dates were computed rather than cached. */
export function dateWorkRuns(scenario: Scenario): number {
	return runs.get(scenario) ?? 0
}

/**
 * The Scenario's flow Occurrences over the span, before their inflation-dependent amounts. They are
 * the same dates for every Market path, so a chance run computes them once and only grows the
 * amounts again. Keyed on the declared Scenario, and pure: no clock, no I/O.
 */
export function occurrenceDates(
	scenario: Scenario,
	timeline: Timeline,
	calendar: ResolvedCalendar | undefined,
): readonly DatedOccurrence[] {
	const bySpan = occurrences.get(scenario) ?? new Map<string, readonly DatedOccurrence[]>()
	occurrences.set(scenario, bySpan)
	const key = spanKey(timeline, calendar)
	const kept = bySpan.get(key)
	if (kept !== undefined) return kept
	runs.set(scenario, dateWorkRuns(scenario) + 1)
	const events = datesOf(scenario, timeline, calendar)
	bySpan.set(key, events)
	return events
}

function datesOf(
	scenario: Scenario,
	timeline: Timeline,
	calendar: ResolvedCalendar | undefined,
): readonly DatedOccurrence[] {
	const events: DatedOccurrence[] = []
	const moved = movedOnceStarts(scenario, calendar)
	for (const declared of scenario.flows) {
		const flow = resolveLoan(declared, scenario.accounts)
		const shifted = moved.get(flow.id)
		for (const occurrence of flowOccurrences(flow, shifted, timeline, calendar)) {
			events.push({
				date: occurrence.date,
				flow,
				years: occurrence.years,
				...(shifted === undefined ? {} : { deferred: true }),
			})
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
	return Object.freeze(events)
}
