import type { RecordedValues } from "../engine/account-values"
import type { DatedEvent } from "../engine/events"
import type { StateMap } from "../engine/state"
import type { DateString } from "../types"
import { isDerived } from "../types"

/** The dates a window reads an Account on, sorted: where the original plan has a Derived event. */
export interface ReadDates {
	readonly sorted: readonly DateString[]
	readonly set: ReadonlySet<DateString>
}

/** The dates of the original plan's Derived events, which its windows price (ADR 0020). */
export function readDatesOf(events: readonly DatedEvent[]): ReadDates {
	const set = new Set<DateString>()
	for (const event of events) if (isDerived(event.flow)) set.add(event.date)
	return { sorted: [...set].sort(), set }
}

/**
 * Records the read dates the walk does not stand on: each one from index `from` and before `before`
 * (all the rest when `before` is `undefined`). A date the walk stands on is recorded by the walk, so
 * it is only stepped over. Returns the index of the next read date.
 */
export function recordReads(
	values: RecordedValues | undefined,
	sorted: readonly DateString[],
	from: number,
	states: StateMap,
	before?: DateString,
): number {
	let index = from
	while (index < sorted.length && (before === undefined || sorted[index]! < before)) {
		values?.record(sorted[index]!, states)
		index++
	}
	return sorted[index] === before && before !== undefined ? index + 1 : index
}
