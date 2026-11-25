import type { AccountId, DateString, MinorUnits } from "./common"

/**
 * One calendar month of one liability, or the part of a month that the Projection covers. The
 * identity `opening + drawn + interest − paid − transferred = closing` holds exactly for every month, where
 * `transferred` is 0 for a liability no transfer pays down.
 */
export interface LiabilityMonth {
	readonly from: DateString
	readonly to: DateString
	/** Amount owed at the start, Accrued interest included. */
	readonly opening: MinorUnits
	/** Planned withdrawals that borrowed from this liability in the month. */
	readonly drawn: MinorUnits
	/** Debt payments applied in the month, after the cap at the amount owed. */
	readonly paid: MinorUnits
	/**
	 * Transfers that paid this liability down in the month, from the plan's own Accounts (ADR 0031); present only
	 * when a transfer Flow targets it. A payment, kept apart from `paid`: `opening + drawn + interest − paid −
	 * transferred = closing`.
	 */
	readonly transferred?: MinorUnits
	/** Interest the engine accrued and capitalised in the month, plus any Accrued interest left at its end. */
	readonly interest: MinorUnits
	/** Amount owed at the end, Accrued interest included. */
	readonly closing: MinorUnits
	readonly partial: boolean
}

/** One liability's monthly statement; `paidOff` is absent while the amount owed never reaches zero. */
export interface LiabilityStatement {
	readonly account: AccountId
	readonly months: readonly LiabilityMonth[]
	/** The first Landed date the amount owed reaches zero after being above zero. */
	readonly paidOff?: DateString
}

/** Optional outputs of `project()`. Without an option, the Projection is byte-identical to before it existed. */
export interface ProjectionOptions {
	readonly liabilityStatements?: boolean
	/** One cash-flow breakdown per Annual roll-up; present only when set. */
	readonly cashflowBreakdown?: boolean
	/** One Spending rule statement per rule Flow; present only when set. */
	readonly spendingRules?: boolean
	/** One Estate statement per row; present only when set. */
	readonly estate?: boolean
	/** Each routing target in force on the start and the horizon; present only when set and a target is `{ amount, growth }` (ADR 0030). */
	readonly routing?: boolean
}
