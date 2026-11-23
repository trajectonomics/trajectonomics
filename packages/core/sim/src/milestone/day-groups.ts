import type { DatedEvent } from "../engine/events"
import type { DateString, Flow } from "../types"

/** The events of one Landed date, and whether any of its Flows is gated. */
export interface DayGroup {
	readonly day: DateString
	readonly events: readonly DatedEvent[]
	readonly gated: boolean
}

/** A plan's events by Landed date, the Flows with a gate, and the windows already summed. */
export interface PlanDays {
	readonly groups: readonly DayGroup[]
	readonly gates: readonly Flow[]
	/** A window's total by date, terms, horizon and gate state; kept only when its price reads no Account. */
	readonly totals: Map<string, bigint | undefined>
}

const grouped: WeakMap<readonly DatedEvent[], PlanDays> = new WeakMap()

/** The plan's events grouped by Landed date, in date order; built once per plan. */
export function planDays(events: readonly DatedEvent[]): PlanDays {
	const kept = grouped.get(events)
	if (kept !== undefined) return kept
	const groups: { day: DateString; events: DatedEvent[]; gated: boolean }[] = []
	const gates = new Set<Flow>()
	for (const event of events) {
		let group = groups[groups.length - 1]
		if (group === undefined || group.day !== event.date) {
			group = { day: event.date, events: [], gated: false }
			groups.push(group)
		}
		group.events.push(event)
		if (event.flow.startAt === undefined && event.flow.endAt === undefined) continue
		group.gated = true
		gates.add(event.flow)
	}
	for (const group of groups) Object.freeze(group.events)
	const days: PlanDays = { groups: Object.freeze(groups), gates: [...gates], totals: new Map() }
	grouped.set(events, days)
	return days
}

/** The first group whose date is on or after `date`. */
export function firstGroupOnOrAfter(groups: readonly DayGroup[], date: DateString): number {
	let low = 0
	let high = groups.length
	while (low < high) {
		const middle = (low + high) >> 1
		if (groups[middle]!.day < date) low = middle + 1
		else high = middle
	}
	return low
}
