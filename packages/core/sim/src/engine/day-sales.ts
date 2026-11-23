import type { AccountId, Scenario } from "../types"
import { addTo } from "./add"
import type { Planned } from "./derive"
import type { DatedEvent } from "./events"
import { minBigInt } from "./min"
import { occurrenceAmount } from "./occurrence-amount"
import type { StateMap } from "./state"

/**
 * What each sale Flow (a withdrawal from an asset) moved on the date. Same-date sales from one
 * Account were summed and capped by its value, so the amount it gave up splits back to the Flows in
 * Scenario order, first come first served, as the contributions into one Account do.
 */
export function saleLines(
	scenario: Scenario,
	states: StateMap,
	events: readonly DatedEvent[],
	planned: Planned,
	sold: ReadonlyMap<AccountId, bigint>,
): Map<string, bigint> {
	const position = new Map(scenario.flows.map((flow, index) => [flow.id, index] as const))
	const sales = events.filter(
		(event) =>
			event.flow.kind === "withdrawal" && states.get(event.flow.source)?.rule.kind === "asset",
	)
	sales.sort((a, b) => position.get(a.flow.id)! - position.get(b.flow.id)!)
	const remaining = new Map(sold)
	const lines = new Map<string, bigint>()
	for (const { flow, ...event } of sales) {
		if (flow.kind !== "withdrawal") continue
		const left = remaining.get(flow.source) ?? 0n
		const taken = minBigInt(occurrenceAmount({ ...event, flow }, planned), left)
		remaining.set(flow.source, left - taken)
		addTo(lines, flow.id, taken)
	}
	return lines
}
