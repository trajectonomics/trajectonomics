import {
	accrualDenominator,
	capitaliseThrough,
	commitThrough,
	interestOf,
	type NominalRule,
} from "../money/nominal"
import type { DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { commitGains } from "./levy-gains"
import { commitReturns, rebaseReturns } from "./levy-returns"
import type { LevySet } from "./levy-set"
import { isSafeInteger, overflow } from "./overflow"
import type { AccountState } from "./state"
import { activeNominalRule, valuation } from "./value"

function negative(id: string, date: DateString): RangeError {
	return new RangeError(`Negative balance on ${id} at ${date}`)
}

function commit(
	state: AccountState,
	capitalised: bigint,
	capitalisedDays: bigint,
	date: DateString,
	levies: LevySet | undefined,
) {
	state.balance = capitalised
	state.capitalisedDays = capitalisedDays
	state.asOf = date
	if (levies !== undefined) rebaseReturns(state, date)
}

/** What leaves an Account without a sale: a payout (ADR 0027) or a fee (ADR 0028). */
export type Distribution = "payout" | "fee"

/**
 * Books the growth since the last commit, and the gain a withdrawal realises unless it is a distribution.
 * A fee is taken off the growth it was charged on.
 */
function bookTallies(
	state: AccountState,
	levies: LevySet | undefined,
	date: DateString,
	delta: bigint,
	valueBefore: bigint,
	distribution: Distribution | undefined,
): void {
	if (levies === undefined) return
	const fee = distribution === "fee" ? -delta : 0n
	for (const tracker of levies.trackers) commitReturns(state, tracker, date, fee)
	if (distribution === undefined) commitGains(state, levies, date, delta, valueBefore)
}

/** Nominal commit: completed periods capitalise first, then the delta applies to capitalised. */
function nominalCommit(
	state: AccountState,
	rule: NominalRule,
	date: DateString,
	delta: bigint,
	levies: LevySet | undefined,
	distribution: Distribution | undefined,
): ProjectionProblem | undefined {
	bookTallies(state, levies, date, delta, valuation(state, date), distribution)
	const settled = capitaliseThrough(
		{ capitalised: state.balance, capitalisedDays: state.capitalisedDays, asOf: state.asOf },
		rule,
		date,
	)
	if (!isSafeInteger(settled.capitalised)) return overflow(date, state.rule.id)
	const running = commitThrough(settled, date)
	const next = running.capitalised + delta
	if (next >= 0n) {
		if (!isSafeInteger(next)) return overflow(date, state.rule.id)
		commit(state, next, running.capitalisedDays, date, levies)
		return undefined
	}
	// An overdrawing debit capitalises the running period first, so the Account can be paid off.
	const accrued = interestOf(running.capitalisedDays, rule.rate, accrualDenominator(rule, date))
	const cleared = running.capitalised + accrued + delta
	if (cleared < 0n) throw negative(state.rule.id, date)
	if (!isSafeInteger(cleared)) return overflow(date, state.rule.id)
	commit(state, cleared, 0n, date, levies)
	return undefined
}

/**
 * Commits accrued growth, then applies `delta`; returns a problem on overflow. The commit books
 * the tallies the change produces (returns attribution, later realised gains) before moving. A
 * `distribution` (a payout, ADR 0027, or a fee, ADR 0028) is no sale: it takes no Cost basis and realises no gain.
 */
export function mutate(
	state: AccountState,
	date: DateString,
	delta: bigint,
	levies: LevySet | undefined,
	distribution?: Distribution,
): ProjectionProblem | undefined {
	const rule = activeNominalRule(state)
	if (rule !== undefined) return nominalCommit(state, rule, date, delta, levies, distribution)
	const committed = valuation(state, date)
	if (!isSafeInteger(committed)) return overflow(date, state.rule.id)
	const next = committed + delta
	if (next < 0n) throw negative(state.rule.id, date)
	if (!isSafeInteger(next)) return overflow(date, state.rule.id)
	bookTallies(state, levies, date, delta, committed, distribution)
	state.balance = next
	state.asOf = date
	if (levies !== undefined) rebaseReturns(state, date)
	return undefined
}
