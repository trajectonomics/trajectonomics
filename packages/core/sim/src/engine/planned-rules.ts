import type { BasisPoints, DateString } from "../types"
import { isRuled } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { DatedEvent } from "./events"
import { overflow } from "./overflow"
import { type RuleBook, ruleAmount } from "./rule-book"

export type RuledOutcome =
	| { readonly ok: true; readonly ruled: ReadonlyMap<DatedEvent, bigint> }
	| { readonly ok: false; readonly problem: ProjectionProblem }

/**
 * The amount each rule Flow's Occurrence on `date` pays, in the order the events are given, which
 * advances the book; each Flow's total joins `totals` so a Derived amount can read it. A date
 * with no rule event leaves the book as it was.
 */
export function ruledAmounts(
	events: readonly DatedEvent[],
	totals: Map<string, bigint>,
	rules: RuleBook | undefined,
	date: DateString,
	reads: {
		readonly inflation: BasisPoints
		readonly readAccount: (accountId: string) => bigint
	},
): RuledOutcome {
	const ruled = new Map<DatedEvent, bigint>()
	if (rules === undefined) return { ok: true, ruled }
	for (const event of events) {
		const { flow } = event
		if (!isRuled(flow)) continue
		const amount = ruleAmount(rules, { flow, date, years: event.years }, reads)
		if (amount === undefined) return { ok: false, problem: overflow(date) }
		ruled.set(event, amount)
		totals.set(flow.id, (totals.get(flow.id) ?? 0n) + amount)
	}
	return { ok: true, ruled }
}
