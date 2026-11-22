import { addDays, addMonthsClamped } from "../calendar/arith"
import { plannedAmounts } from "../engine/derive"
import type { DatedEvent } from "../engine/events"
import type { BasisPoints, DateString, Flow, MilestoneTerms } from "../types"
import { landsAt } from "./gating"
import { termed } from "./metrics"

/** The expense this run landed on one Landed date. */
export interface TrailEntry {
	readonly date: DateString
	readonly expense: bigint
}

export interface Money {
	readonly start: DateString
	readonly inflation: BasisPoints
}

/** The plan an expense window reads: its events in date order, its Flows and its bounds. */
export interface PlanView extends Money {
	readonly events: readonly DatedEvent[]
	readonly flows: readonly Flow[]
	readonly horizon: DateString
}

/** Expenses landed in `[date − 12 months, date)`; `undefined` when that window starts before `start`. */
export function trailingExpenses(
	trail: readonly TrailEntry[],
	date: DateString,
	money: Money,
	terms: MilestoneTerms,
): bigint | undefined {
	const from = addMonthsClamped(date, -12)
	if (from < money.start) return undefined
	let total = 0n
	for (const entry of trail) {
		if (entry.date < from || entry.date >= date) continue
		total += termed(entry.expense, entry.date, money.start, money.inflation, terms)
	}
	return total
}

/** The first index whose event is on or after `date`, in a list sorted by date. */
function firstOnOrAfter(events: readonly DatedEvent[], date: DateString): number {
	let low = 0
	let high = events.length
	while (low < high) {
		const middle = Math.floor((low + high) / 2)
		if (events[middle]!.date < date) low = middle + 1
		else high = middle
	}
	return low
}

/** The planned expense of one Landed date's events, or `undefined` when a planned amount fails. */
function expenseOn(
	events: readonly DatedEvent[],
	day: DateString,
	plan: PlanView,
): bigint | undefined {
	const planned = plannedAmounts(events, plan.flows, day, plan.inflation)
	if (!planned.ok) return undefined
	let amount = 0n
	for (const event of events) {
		if (event.flow.kind !== "expense") continue
		amount += event.amount ?? planned.planned.derived.get(event.flow.id) ?? 0n
	}
	return amount
}

/** The events on the first Landed date from `index` that land as of `date`, and the index past that date. */
function landingDay(
	events: readonly DatedEvent[],
	index: number,
	fires: ReadonlyMap<string, DateString>,
	date: DateString,
): { readonly day: DateString; readonly landing: DatedEvent[]; readonly next: number } {
	const day = events[index]!.date
	const landing: DatedEvent[] = []
	let next = index
	for (; next < events.length && events[next]!.date === day; next++) {
		const event = events[next]!
		if (landsAt(fires, event.flow, date)) landing.push(event)
	}
	return { day, landing, next }
}

/**
 * Planned expenses over `[date, date + 12 months)` of the Flows that land as of `date`. Partial when
 * the window runs past the horizon, and `undefined` then or when a planned Derived amount fails.
 */
export function plannedExpenses(
	plan: PlanView,
	fires: ReadonlyMap<string, DateString>,
	date: DateString,
	terms: MilestoneTerms,
): bigint | undefined {
	const to = addMonthsClamped(date, 12)
	if (to > addDays(plan.horizon, 1)) return undefined
	let total = 0n
	let index = firstOnOrAfter(plan.events, date)
	while (index < plan.events.length && plan.events[index]!.date < to) {
		const { day, landing, next } = landingDay(plan.events, index, fires, date)
		index = next
		if (landing.length === 0) continue
		const amount = expenseOn(landing, day, plan)
		if (amount === undefined) return undefined
		total += termed(amount, day, plan.start, plan.inflation, terms)
	}
	return total
}
