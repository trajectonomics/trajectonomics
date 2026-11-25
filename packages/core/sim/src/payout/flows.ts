import { periodsPerYear } from "../calendar/compounding"
import type {
	AccountId,
	AssetRule,
	CompoundingPeriod,
	Derive,
	Flow,
	IncomeFlow,
	Scenario,
} from "../types"

/**
 * The passive income an Account's payout lands as (ADR 0027): an income Flow with `earned: false`, a
 * Derived amount that reads the Account's value, and the Account and period its dates and debit come
 * from. `check()` refuses a declared Flow that carries `payoutOf`, so only this module makes one.
 */
export type PayoutFlow = IncomeFlow & {
	readonly payoutOf: { readonly account: AccountId; readonly period: CompoundingPeriod }
}

export function isPayout(flow: Flow): flow is PayoutFlow {
	return "payoutOf" in flow
}

/**
 * The asset Accounts that pay out a share above 0 bps, in Scenario order, read from the Accounts so it
 * holds for the declared Scenario as well as the one `withPayouts` expanded. A payout of 0 is none.
 */
export function payingAccounts(scenario: Scenario): readonly AssetRule[] {
	return scenario.accounts.filter(
		(account): account is AssetRule =>
			account.kind === "asset" && account.payout !== undefined && account.payout.bps > 0,
	)
}

/** Whether the Scenario's Accounts pay out, so its Projection reports payouts. */
export function declaresPayouts(scenario: Scenario): boolean {
	return scenario.flows.some(isPayout)
}

/** `value × bps / (10000 × periods a year)`, rounded as the payout says, read before the date's Flows. */
function amountOf(account: AssetRule): Derive {
	const payout = account.payout!
	const den = 10_000 * periodsPerYear(payout.frequency)
	return {
		measures: [
			{ id: "value", op: "account", account: account.id },
			{ id: "share", op: "scale", of: "value", num: payout.bps, den, rounding: payout.rounding },
		],
		result: "share",
	}
}

function flowOf(account: AssetRule): PayoutFlow {
	const payout = account.payout!
	return {
		id: `payout:${account.id}`,
		kind: "income",
		earned: false,
		// The dates come from `payoutOf`; the Flow's own frequency is read by nothing.
		frequency: "monthly",
		start: payout.start ?? "0001-01-01",
		...(payout.end === undefined ? {} : { end: payout.end }),
		...(payout.startAt === undefined ? {} : { startAt: payout.startAt }),
		...(payout.endAt === undefined ? {} : { endAt: payout.endAt }),
		...(payout.label === undefined ? {} : { label: payout.label }),
		...(payout.prepayments === undefined ? {} : { prepayments: payout.prepayments }),
		derive: amountOf(account),
		payoutOf: { account: account.id, period: payout.frequency },
	}
}

const expanded: WeakMap<Scenario, Scenario> = new WeakMap()

/**
 * The Scenario every run reads: the same one, unless an Account pays out a share above 0, then a
 * copy with one payout Flow per such Account after the declared Flows, in Account order. A payout of
 * 0 is no payout, so its Projection is byte for byte the one without it. Kept per Scenario, so the
 * events and caches keyed on it are shared.
 */
export function withPayouts(scenario: Scenario): Scenario {
	const kept = expanded.get(scenario)
	if (kept !== undefined) return kept
	const paying = payingAccounts(scenario)
	const result =
		paying.length === 0
			? scenario
			: { ...scenario, flows: [...scenario.flows, ...paying.map(flowOf)] }
	expanded.set(scenario, result)
	return result
}
