import { evaluateDerive } from "../levy/derive"
import type { Inflation } from "../money/inflation"
import type { DateString, Flow } from "../types"
import { isFixed } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { fixedAmountAt } from "./amount"
import { derivedOrder } from "./derived-order"
import type { DatedEvent } from "./events"
import { ruledAmounts } from "./planned-rules"
import type { RuleBook } from "./rule-book"

/** One date's planned gross amounts: `totals` per Flow id, and a Derived Flow's amount per event. */
export interface Planned {
	readonly totals: ReadonlyMap<string, bigint>
	readonly derived: ReadonlyMap<string, bigint>
	/** What each rule Flow's Occurrence pays; absent when the Scenario has none (ADR 0023). */
	readonly ruled?: ReadonlyMap<DatedEvent, bigint>
}

export type PlannedOutcome =
	| { readonly ok: true; readonly planned: Planned }
	| { readonly ok: false; readonly problem: ProjectionProblem }

function occurred(events: readonly DatedEvent[]): Map<string, number> {
	const counts = new Map<string, number>()
	for (const event of events) counts.set(event.flow.id, (counts.get(event.flow.id) ?? 0) + 1)
	return counts
}

function fixedTotals(events: readonly DatedEvent[], inflation: Inflation): Map<string, bigint> {
	const totals = new Map<string, bigint>()
	for (const event of events) {
		if (!isFixed(event.flow)) continue
		const amount = event.amount ?? fixedAmountAt(event.flow, event.years, inflation, event.date)
		totals.set(event.flow.id, (totals.get(event.flow.id) ?? 0n) + amount)
	}
	return totals
}

/**
 * Every Flow's planned gross amount on one Landed date, before Prepayment and any cap: a fixed
 * Flow sums its events, a Derived Flow evaluates once per date and each of its events gets it.
 */
export function plannedAmounts(
	events: readonly DatedEvent[],
	flows: readonly Flow[],
	date: DateString,
	inflation: Inflation,
	readAccount: (accountId: string) => bigint,
	rules?: RuleBook,
): PlannedOutcome {
	const totals = fixedTotals(events, inflation)
	const set = ruledAmounts(events, totals, rules, date, { inflation, readAccount })
	if (!set.ok) return set
	const { ruled } = set
	const order = derivedOrder(flows)
	if (order.length === 0) return { ok: true, planned: { totals, derived: new Map(), ruled } }
	const counts = occurred(events)
	const derived = new Map<string, bigint>()
	for (const entry of order) {
		const count = counts.get(entry.id) ?? 0
		if (count === 0) continue
		const outcome = evaluateDerive(entry.derive, {
			date,
			inflation,
			path: entry.path,
			read: (id) => totals.get(id) ?? 0n,
			readAccount,
		})
		if (!outcome.ok) return { ok: false, problem: outcome.problem }
		derived.set(entry.id, outcome.amount)
		totals.set(entry.id, outcome.amount * BigInt(count))
	}
	return { ok: true, planned: { totals, derived, ruled } }
}
