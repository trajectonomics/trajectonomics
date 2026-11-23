import type { Planned } from "./derive"
import type { DatedEvent } from "./events"

/** The amount one Occurrence lands: a fixed Flow's grown amount, its rule's part, or its Derived amount for the date. */
export function occurrenceAmount(event: DatedEvent, planned: Planned): bigint {
	return event.amount ?? planned.ruled?.get(event) ?? planned.derived.get(event.flow.id) ?? 0n
}
