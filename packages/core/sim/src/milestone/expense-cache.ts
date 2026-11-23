import type { DatedEvent } from "../engine/events"
import { accountRefsOf } from "../levy/refs"
import type { DateString, Scenario } from "../types"
import { isDerived } from "../types"

/** One Landed date's planned expense, with the events it was priced from and its real-terms figure. */
export interface DayExpense {
	readonly landing: readonly DatedEvent[]
	readonly amount: bigint | undefined
	real?: bigint
}

/** The planned expense of each Landed date a window has read, a few variants per date. */
export type ExpenseCache = Map<DateString, DayExpense[]>

/** The variants kept per date: one for each state of the gates the paths have met. */
const VARIANTS = 8

const caches: WeakMap<Scenario, Map<DateString, ExpenseCache>> = new WeakMap()

/**
 * The cache of a Scenario's planned windows read from `start`, or `undefined` when a Derived amount
 * reads an Account: its figure then depends on the states of the date asked, not on the date alone.
 * Every run of the Scenario shares it (each Market path, each FI candidate), since a planned expense
 * depends only on the events that land, the Scenario's Flows and its inflation.
 */
export function expenseCacheFor(scenario: Scenario, start: DateString): ExpenseCache | undefined {
	const reads = scenario.flows.some(
		(flow) => isDerived(flow) && accountRefsOf(flow.derive).length > 0,
	)
	if (reads) return undefined
	const byStart = caches.get(scenario) ?? new Map<DateString, ExpenseCache>()
	caches.set(scenario, byStart)
	const kept = byStart.get(start) ?? new Map<DateString, DayExpense[]>()
	byStart.set(start, kept)
	return kept
}

function sameEvent(left: DatedEvent, right: DatedEvent): boolean {
	return (
		left.flow === right.flow &&
		left.years === right.years &&
		left.amount === right.amount &&
		left.date === right.date
	)
}

/** The cached figure of a date whose landing events are these, or `undefined`. */
export function pricedFrom(
	variants: readonly DayExpense[] | undefined,
	landing: readonly DatedEvent[],
): DayExpense | undefined {
	return variants?.find(
		(entry) =>
			entry.landing === landing ||
			(entry.landing.length === landing.length &&
				entry.landing.every((event, index) => sameEvent(event, landing[index]!))),
	)
}

/** Keeps a freshly priced date, dropping the oldest variant when the date holds too many. */
export function keep(cache: ExpenseCache, day: DateString, entry: DayExpense): void {
	const variants = cache.get(day) ?? []
	if (variants.length >= VARIANTS) variants.shift()
	variants.push(entry)
	cache.set(day, variants)
}
