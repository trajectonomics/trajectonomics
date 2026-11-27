import { countedDays } from "../calendar/counted"
import { leftOutOfAccessible } from "../engine/accessible"
import type { AccountState, StateMap } from "../engine/state"
import { deflateBy, type Inflation } from "../money/inflation"
import type {
	AccountId,
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
	readonly inflation: Inflation
	/** An Account's value on `date` in the requested terms. */
	readonly account: (state: AccountState, terms: MilestoneTerms) => bigint
	/** An expense window in the requested terms; `undefined` when the window is partial. */
	readonly expenses: (window: ReferenceWindow, terms: MilestoneTerms) => bigint | undefined
}

/** One amount in the requested terms: real money is deflated from `date` to `start`, never before it. */
export function termed(
	value: bigint,
	date: DateString,
	start: DateString,
	inflation: Inflation,
	terms: MilestoneTerms,
): bigint {
	if (terms !== "real") return value
	return deflateBy(value, inflation, date < start ? 0 : countedDays(start, date))
}

/** The sign each named balance gives an Account: 0 leaves it out. */
const SIGN: Readonly<Record<MetricName, (liability: boolean, outside: boolean) => bigint>> = {
	netWorth: (liability) => (liability ? -1n : 1n),
	accessibleNetWorth: (liability, outside) => signedUnlessOutside(liability, outside),
	allAssets: (liability) => (liability ? 0n : 1n),
	unlockedAssets: (liability, outside) => (liability || outside ? 0n : 1n),
	liabilities: (liability) => (liability ? 1n : 0n),
}

function signedUnlessOutside(liability: boolean, outside: boolean): bigint {
	if (liability) return -1n
	return outside ? 0n : 1n
}

function namedValue(name: MetricName, figures: Figures, terms: MilestoneTerms): bigint {
	let total = 0n
	for (const state of figures.states.values()) {
		const sign = SIGN[name](
			state.rule.kind === "liability",
			leftOutOfAccessible(state.rule, figures.date),
		)
		if (sign === 0n) continue
		total += sign * figures.account(state, terms)
	}
	return total
}

function accountsValue(ids: readonly AccountId[], figures: Figures, terms: MilestoneTerms): bigint {
	let total = 0n
	for (const state of figures.states.values()) {
		if (!ids.includes(state.rule.id)) continue
		total += figures.account(state, terms)
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
