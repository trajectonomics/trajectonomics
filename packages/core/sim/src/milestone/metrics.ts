import { countedDays } from "../calendar/counted"
import type { AccountState, StateMap } from "../engine/state"
import { valuation } from "../engine/value"
import { deflate } from "../money/growth"
import type {
	AccountId,
	BasisPoints,
	DateString,
	Metric,
	MetricName,
	MilestoneTerms,
	ReferenceWindow,
} from "../types"

/** The plan's figures on one date, which every Metric is read from. */
export interface Figures {
	readonly date: DateString
	readonly states: StateMap
	readonly start: DateString
	readonly inflation: BasisPoints
	/** An expense window in the requested terms; `undefined` when the window is partial. */
	readonly expenses: (window: ReferenceWindow, terms: MilestoneTerms) => bigint | undefined
}

/** One amount in the requested terms: real money is deflated from `date` to `start`, never before it. */
export function termed(
	value: bigint,
	date: DateString,
	start: DateString,
	inflation: BasisPoints,
	terms: MilestoneTerms,
): bigint {
	if (terms !== "real") return value
	return deflate(value, inflation, date < start ? 0 : countedDays(start, date))
}

function lockedOn(state: AccountState, date: DateString): boolean {
	const rule = state.rule
	return rule.kind === "asset" && rule.lockedUntil !== undefined && date < rule.lockedUntil
}

/** The sign each named balance gives an Account: 0 leaves it out. */
const SIGN: Readonly<Record<MetricName, (liability: boolean, locked: boolean) => bigint>> = {
	netWorth: (liability) => (liability ? -1n : 1n),
	accessibleNetWorth: (liability, locked) => signedUnlessLocked(liability, locked),
	allAssets: (liability) => (liability ? 0n : 1n),
	unlockedAssets: (liability, locked) => (liability || locked ? 0n : 1n),
	liabilities: (liability) => (liability ? 1n : 0n),
}

function signedUnlessLocked(liability: boolean, locked: boolean): bigint {
	if (liability) return -1n
	return locked ? 0n : 1n
}

function namedValue(name: MetricName, figures: Figures, terms: MilestoneTerms): bigint {
	let total = 0n
	for (const state of figures.states.values()) {
		const sign = SIGN[name](state.rule.kind === "liability", lockedOn(state, figures.date))
		if (sign === 0n) continue
		const value = valuation(state, figures.date)
		total += sign * termed(value, figures.date, figures.start, figures.inflation, terms)
	}
	return total
}

function accountsValue(ids: readonly AccountId[], figures: Figures, terms: MilestoneTerms): bigint {
	let total = 0n
	for (const state of figures.states.values()) {
		if (!ids.includes(state.rule.id)) continue
		const value = valuation(state, figures.date)
		total += termed(value, figures.date, figures.start, figures.inflation, terms)
	}
	return total
}

/** A Metric's value on the figures' date, or `undefined` when it reads a partial expense window. */
export function metricValue(
	metric: Metric,
	figures: Figures,
	terms: MilestoneTerms,
): bigint | undefined {
	if (typeof metric === "string") return namedValue(metric, figures, terms)
	if ("accounts" in metric) return accountsValue(metric.accounts, figures, terms)
	return figures.expenses(metric.expenses, terms)
}
