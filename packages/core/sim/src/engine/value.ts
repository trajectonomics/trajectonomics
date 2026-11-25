import { countedDays } from "../calendar/counted"
import { grow } from "../money/growth"
import { accrualParts, capitaliseThrough, type NominalRule } from "../money/nominal"
import type { Account, DateString } from "../types"
import { leftOutOfAccessible } from "./accessible"
import { walkRows } from "./span"
import type { AccountState, StateMap } from "./state"

/** An Account's reported value, split into its capitalised and accrued parts. */
export interface ValueParts {
	readonly capitalised: bigint
	readonly accruedInterest: bigint
	readonly amount: bigint
}

/** The nominal rule of an Account, or `undefined` when its rate is effective annual. */
export function nominalRule(rule: Account): NominalRule | undefined {
	return rule.compounding === undefined
		? undefined
		: { rate: rule.rate, compounding: rule.compounding }
}

/** The nominal rule in force: a Return series replaces the rate, so it suspends nominal accrual. */
export function activeNominalRule(state: AccountState): NominalRule | undefined {
	return state.series === undefined ? nominalRule(state.rule) : undefined
}

/** A Return series replaces the rate, so an Account holding one takes this path. */
function growTo(state: AccountState, date: DateString): GrownRead {
	const series = state.series
	if (series !== undefined) {
		const read = walkRows(state, date, series, state.walked)
		state.walked = read.walked
		return read
	}
	const amount = grow(state.balance, state.rule.rate, countedDays(state.asOf, date))
	return { amount, earning: amount }
}

interface GrownRead {
	readonly amount: bigint
	readonly earning: bigint
}

/** The grown value is read again and again on one date, so the last reading is kept (pure). */
function effectiveParts(state: AccountState, date: DateString): ValueParts {
	const { balance, asOf, grown } = state
	if (asOf === date) return { capitalised: balance, accruedInterest: 0n, amount: balance }
	const hit = grown?.date === date && grown.balance === balance && grown.asOf === asOf
	const read = hit ? grown : growTo(state, date)
	if (!hit) state.grown = { balance, asOf, date, ...read }
	return { capitalised: read.amount, accruedInterest: 0n, amount: read.amount }
}

/**
 * The part of a Return series Account's value on `date` still to earn in the row `date` falls in:
 * what a change on `date` leaves earning the rest of that row (ADR 0005).
 */
export function earningAt(state: AccountState, date: DateString): bigint {
	if (state.asOf === date) return state.earning ?? state.balance
	effectiveParts(state, date)
	return state.grown!.earning
}

/**
 * Read-only for the running period: it never commits the partial interest it reports. It does
 * commit completed capitalisations, which are result-neutral and keep a read on a long gap linear.
 */
export function valueParts(state: AccountState, date: DateString): ValueParts {
	const rule = activeNominalRule(state)
	if (rule === undefined) return effectiveParts(state, date)
	const settled = capitaliseThrough(
		{ capitalised: state.balance, capitalisedDays: state.capitalisedDays, asOf: state.asOf },
		rule,
		date,
	)
	state.balance = settled.capitalised
	state.capitalisedDays = settled.capitalisedDays
	state.asOf = settled.asOf
	return accrualParts(settled, rule, date)
}

export function valuation(state: AccountState, date: DateString): bigint {
	return valueParts(state, date).amount
}

function signedValue(state: AccountState, date: DateString): bigint {
	const value = valuation(state, date)
	return state.rule.kind === "liability" ? -value : value
}

export function netWorth(states: StateMap, date: DateString): bigint {
	let total = 0n
	for (const state of states.values()) total += signedValue(state, date)
	return total
}

export function accessibleNetWorth(states: StateMap, date: DateString): bigint {
	let total = 0n
	for (const state of states.values()) {
		if (state.rule.kind === "liability") total -= valuation(state, date)
		else if (!leftOutOfAccessible(state.rule, date)) total += valuation(state, date)
	}
	return total
}
