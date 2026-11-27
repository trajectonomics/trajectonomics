import { addMonthsClamped } from "../calendar/arith"
import type { DatedEvent } from "../engine/events"
import type { Inflation } from "../money/inflation"
import type { DateString, Flow, MilestoneTerms } from "../types"
import type { ExpenseCache } from "./expense-cache"
import { termed } from "./metrics"

/** The expense this run landed on one Landed date. */
export interface TrailEntry {
	readonly date: DateString
	readonly expense: bigint
}

export interface Money {
	readonly start: DateString
	readonly inflation: Inflation
}

/** The plan an expense window reads: its events in date order, its Flows and its bounds. */
export interface PlanView extends Money {
	readonly events: readonly DatedEvent[]
	readonly flows: readonly Flow[]
	/** The day after the horizon: a window that ends past it is partial. */
	readonly pastHorizon: DateString
	/** Each Landed date's planned expense, when no Derived amount reads an Account. */
	readonly cache?: ExpenseCache
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
