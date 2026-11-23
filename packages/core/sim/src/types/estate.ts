import type { AccountId, BasisPoints, DateString, Growth, MinorUnits } from "./common"
import type { Rounding } from "./measure"

/** A cost that is a share of the gross estate, or of the named asset Accounts' value (ADR 0025). */
export interface ShareCost {
	readonly id: string
	readonly of: "gross" | { readonly accounts: readonly AccountId[] }
	readonly bps: BasisPoints
	readonly rounding: Rounding
}

/** A gift that is a share of the net estate (taken from a positive net only). */
export interface ShareGift {
	readonly id: string
	readonly of: "net"
	readonly bps: BasisPoints
	readonly rounding: Rounding
}

/** A fixed amount, grown by whole years from `Timeline.start`; a cost or a gift. */
export interface FixedEstateLine {
	readonly id: string
	readonly amount: MinorUnits
	readonly growth: Growth
}

export type EstateCost = ShareCost | FixedEstateLine
export type EstateGift = ShareGift | FixedEstateLine

/** The Scenario's optional estate block. It is inert: no other figure changes with it. */
export interface Estate {
	readonly costs?: readonly EstateCost[]
	readonly gifts?: readonly EstateGift[]
}

/** One cost or gift on a date, in the block's order. */
export interface EstateLine {
	readonly id: string
	readonly amount: MinorUnits
}

/**
 * The same figures in today's money: `net` is the row's `realNetWorth` less each cost deflated once, and
 * `toHeirs` that less each gift deflated once (0 when `toHeirs` is 0).
 */
export interface EstateInTodaysMoney {
	readonly net: MinorUnits
	readonly toHeirs: MinorUnits
}

/**
 * What the estate would be on one row's date. `net = gross − debts − Σcosts` is signed; a negative net
 * leaves `gifts` at 0 and `toHeirs` 0, and `−net` is the shortfall. Otherwise
 * `gross − debts − Σcosts − Σgifts = toHeirs`, where `Σcosts` and `Σgifts` are `costsTotal` and `giftsTotal`.
 */
export interface EstateStatement {
	readonly date: DateString
	/** Every asset Account's value, locked and Illiquid ones included. */
	readonly gross: MinorUnits
	/** Every liability's amount owed. */
	readonly debts: MinorUnits
	readonly costs: readonly EstateLine[]
	/** The exact sum of `costs`, 0 with none. */
	readonly costsTotal: MinorUnits
	readonly net: MinorUnits
	readonly gifts: readonly EstateLine[]
	/** The exact sum of `gifts`, 0 with none. */
	readonly giftsTotal: MinorUnits
	readonly toHeirs: MinorUnits
	readonly real: EstateInTodaysMoney
}
