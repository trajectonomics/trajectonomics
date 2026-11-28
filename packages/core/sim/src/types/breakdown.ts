import type { AccountId, DateString, MinorUnits } from "./common"
import type { CashflowLines } from "./reporting"

/** One Levy's amount in a period; `levy` is the Levy id. */
export interface LevyLine {
	readonly levy: string
	readonly amount: MinorUnits
}

/** One Flow's planned amount in a period, before any Prepayment; `flow` is the Flow id. */
export interface FlowLine {
	readonly flow: string
	readonly amount: MinorUnits
}

/** One expense Flow's amount; `category` is present only when the Flow declares one. */
export interface ExpenseLine extends FlowLine {
	readonly category?: string
}

/** Expenses summed per category; `category` is `null` for expenses that declare none. */
export interface CategoryLine {
	readonly category: string | null
	readonly amount: MinorUnits
}

/** One contribution Flow's applied and unfunded amounts, with the Account it paid into. */
export interface ContributionLine {
	readonly flow: string
	readonly account: AccountId
	readonly applied: MinorUnits
	readonly unfunded: MinorUnits
}

/** One employer Contribution Flow's amount landed in its Account; it never entered cashflow. */
export interface EmployerLine {
	readonly flow: string
	readonly account: AccountId
	readonly amount: MinorUnits
}

/** One Account's payouts landed as passive income; they are in the identity as money in. */
export interface PayoutLine {
	readonly account: AccountId
	readonly amount: MinorUnits
}

/** One planned withdrawal Flow's amount, with the liability it borrowed from. */
export interface WithdrawalLine {
	readonly flow: string
	readonly account: AccountId
	readonly amount: MinorUnits
}

/** One transfer Flow's amount moved between its Accounts, outside cashflow; `unmoved` is planned and not moved. */
export interface TransferLine {
	readonly flow: string
	readonly source: AccountId
	readonly target: AccountId
	readonly amount: MinorUnits
	readonly unmoved: MinorUnits
}

/** One Account's amount moved through `cashflow.withdraw` or `cashflow.surplus`. */
export interface AccountLine {
	readonly account: AccountId
	readonly amount: MinorUnits
}

/**
 * One entry of `cashflow.withdraw` that drew money. `entry` is its position in the list and is present only
 * when the list declares a Reserve floor, where an Account may appear twice (ADR 0030).
 */
export interface DrawnLine extends AccountLine {
	readonly entry?: number
}

/**
 * One Annual roll-up's cash-flow breakdown, with the same `index`, `from` and `to`. Every total
 * equals its roll-up field, and the identity in `docs/adr/0018` holds exactly in minor units.
 */
export type CashflowBreakdown = {
	readonly index: number
	readonly from: DateString
	readonly to: DateString
} & CashflowLines
