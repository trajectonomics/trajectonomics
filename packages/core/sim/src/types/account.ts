import type { AccountId, BasisPoints, CompoundingPeriod, DateString } from "./common"

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
