import type { AccountId, BasisPoints, CompoundingPeriod, DateString } from "./common"
import type { Prepayment } from "./flow"
import type { Rounding } from "./measure"

/**
 * A yearly share of an asset's value paid out of it as passive income (ADR 0027). `rate` stays the total
 * return; what is paid out leaves, the rest compounds. The window fields mean what they mean on a Flow.
 */
export interface Payout {
	/** The yearly share of value paid out, 0 to 10000 bps. */
	readonly bps: BasisPoints
	/** The calendar period at whose last day a payout lands. */
	readonly frequency: CompoundingPeriod
	/** How each payout is rounded to a minor unit. Required; no default. */
	readonly rounding: Rounding
	readonly start?: DateString
	readonly end?: DateString
	/** A Milestone id: the Account pays out only on or after that Milestone's fire date. */
	readonly startAt?: string
	/** A Milestone id: the Account pays out only strictly before that Milestone's fire date. */
	readonly endAt?: string
	/** Gross Tally label of each payout, as on an income Flow. Needs a Levy; refused beside `returnLabel`. */
	readonly label?: string
	/** Shares of each payout taken at source, as on an income Flow. Needs a Levy. */
	readonly prepayments?: readonly Prepayment[]
}

/** Asset: `rate` is the expected return. Locked money does not count until `lockedUntil`. */
export interface AssetRule {
	readonly id: AccountId
	readonly kind: "asset"
	/** Effective annual rate, or the nominal annual rate when `compounding` is present. */
	readonly rate: BasisPoints
	readonly compounding?: CompoundingPeriod
	readonly lockedUntil?: DateString
	/**
	 * `false` marks an illiquid asset, such as a home or a car: it stays in Net worth but is left out of
	 * Accessible net worth, the reference, the Minimum buffer and the accessible Metrics, and no
	 * withdrawal or surplus step may draw on it. Absent or `true` means liquid.
	 */
	readonly liquid?: boolean
	/** Tally label for this Account's accrued growth; absent means it is never tallied. */
	readonly returnLabel?: string
	/** Tally label for this Account's realised gains; absent means it is never tallied. */
	readonly gainLabel?: string
	/** Pays part of the total return out as passive income; absent means everything is reinvested. */
	readonly payout?: Payout
}

/** Liability: `rate` is the interest on the outstanding balance. Cannot be locked. */
export interface LiabilityRule {
	readonly id: AccountId
	readonly kind: "liability"
	/** Effective annual rate, or the nominal annual rate when `compounding` is present. */
	readonly rate: BasisPoints
	readonly compounding?: CompoundingPeriod
}

export type Account = AssetRule | LiabilityRule
