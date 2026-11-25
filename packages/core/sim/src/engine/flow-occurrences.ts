import type { ResolvedCalendar } from "../calendar/business"
import { type Occurrence, occurrences } from "../calendar/occurrence"
import { payoutOccurrences } from "../calendar/payout"
import { isPayout } from "../payout/flows"
import type { DateString, Flow, Timeline } from "../types"

/**
 * One Flow's Occurrences in the timeline: a payout's calendar period ends (ADR 0027), or its
 * recurrence from its start, which a Milestone gate may have moved (`shifted`, a `once` Flow).
 */
export function flowOccurrences(
	flow: Flow,
	shifted: DateString | undefined,
	timeline: Timeline,
	calendar: ResolvedCalendar | undefined,
): readonly Occurrence[] {
	const { start, horizon } = timeline
	if (isPayout(flow)) {
		return payoutOccurrences(flow.start, flow.payoutOf.period, flow.end, start, horizon, calendar)
	}
	return occurrences(shifted ?? flow.start, flow.frequency, flow.end, start, horizon, calendar)
}
