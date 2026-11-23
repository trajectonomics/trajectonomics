import type { AccountId, BasisPoints, DateString } from "./common"
import type { FixedAmount } from "./flow"
import type { Rounding } from "./measure"

/** What every Spending rule reads: the asset Accounts summed, the rate, and how each division rounds. */
interface RuleBase {
	/** One or more asset Accounts, read and summed on the first date of each Rule year (ADR 0023). */
	readonly portfolio: readonly AccountId[]
	/** A positive share of the portfolio, at most 10000. */
	readonly rateBps: BasisPoints
	/** Required, no default: how each division by 10000 rounds. */
	readonly rounding: Rounding
}

/** The first year's rate fixed in real terms: each later year is the first amount grown by inflation. */
export interface InitialRateRule extends RuleBase {
	readonly kind: "initialRate"
}

/** A rate step: from `from` on, `bps` replaces the rule's rate. */
export interface RateStep {
	readonly from: DateString
	readonly bps: BasisPoints
}

/** A share of what the portfolio is worth each year, with optional rate steps, a floor and a ceiling. */
export interface CurrentRateRule extends RuleBase {
	readonly kind: "currentRate"
	readonly steps?: readonly RateStep[]
	/**
	 * A lower and an upper bound on a year's amount. Each grows from the Flow's `start`, not from the
	 * Flow's first Landed date, so a Flow a Milestone gates meets a bound that has already grown by
	 * the years before it lands.
	 */
	readonly floor?: FixedAmount
	readonly ceiling?: FixedAmount
}

/** A band on the withdrawal rate, and how far the amount moves when the rate leaves it. */
export interface GuardrailBand {
	readonly bps: BasisPoints
	readonly adjustBps: BasisPoints
}

/** Last year's amount grown by inflation, cut above `upper` and raised below `lower`. */
export interface GuardrailsRule extends RuleBase {
	readonly kind: "guardrails"
	readonly upper?: GuardrailBand
	readonly lower?: GuardrailBand
}

export type SpendingRule = InitialRateRule | CurrentRateRule | GuardrailsRule

/** An amount fixed once per Rule year from the portfolio's value (ADR 0023). */
export interface RuledAmount {
	readonly rule: SpendingRule
}

/** What a Rule year did to the amount it started from. */
export type RuleAction = "none" | "floor" | "ceiling" | "cut" | "raise"

/** A Rule year's `amount` and `paid` deflated to the Timeline start, half up, as the row's `realNetWorth` is. */
export interface RealRuleYear {
	readonly amount: number
	readonly paid: number
}

/** One Rule year of a Spending rule statement; money is in minor units. */
export interface SpendingRuleYear {
	/** The Landed date the year began on, when its amount was fixed. */
	readonly date: DateString
	/** The portfolio's value `P` on that date, before any Flow landed. */
	readonly portfolio: number
	/** The yearly amount `Y` the rule fixed. */
	readonly amount: number
	/**
	 * What the year's Occurrences paid: the whole `amount`, or fewer when the horizon or a Shortfall
	 * ends it. The Occurrence a Shortfall fell on counts in full, as the Projection's `expense` does,
	 * though only part of it was met: the day's `unmet` is the whole day across every expense, so a
	 * reader that wants what this Flow left unpaid must split `unmet` by Flow, never subtract it.
	 */
	readonly paid: number
	/** `amount` and `paid` in today's money, each deflated once at `date` (ADR 0023). */
	readonly real: RealRuleYear
	/**
	 * `floor(amount × 10000 / portfolio)`; absent when the portfolio is 0. It exceeds 10000 when the
	 * amount is more than a depleted portfolio is worth.
	 */
	readonly withdrawalRateBps?: BasisPoints
	readonly action: RuleAction
}

/** The Rule years of one rule Flow, present only with the `spendingRules` option. */
export interface SpendingRuleStatement {
	readonly flow: string
	readonly years: readonly SpendingRuleYear[]
}
