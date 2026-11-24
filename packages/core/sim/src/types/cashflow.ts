import type { AccountId, BasisPoints, MinorUnits } from "./common"
import type { FixedAmount } from "./flow"

/**
 * An amount a routing step keeps or fills to: a nominal figure, or `{ amount, growth }` grown by whole
 * years from the Timeline start, so it keeps its value in today's money (ADR 0030).
 */
export type RoutedAmount = MinorUnits | FixedAmount

/**
 * One surplus step: fill `account` (up to `upTo` if given), then move to the next step. With `share`
 * the step fills `floor(remaining × share / 10000)` instead of everything that is left (ADR 0030).
 */
export interface SurplusStep {
	readonly account: AccountId
	readonly upTo?: RoutedAmount
	readonly share?: BasisPoints
}

/** A withdrawal entry that draws `account` only down to `downTo`, then moves on (ADR 0030). */
export interface WithdrawStep {
	readonly account: AccountId
	readonly downTo: RoutedAmount
}

/** A withdrawal entry: an Account drawn to nothing, or one drawn down to a Reserve floor. */
export type WithdrawEntry = AccountId | WithdrawStep

export interface Cashflow {
	readonly surplus: readonly SurplusStep[]
	/** Ordered funding priority for asset contributions. Every asset target must appear; extras are inert. */
	readonly contribute: readonly AccountId[]
	/** Ordered withdrawal sources; locked accounts are skipped. An Account may repeat with a lower floor. */
	readonly withdraw: readonly WithdrawEntry[]
}
