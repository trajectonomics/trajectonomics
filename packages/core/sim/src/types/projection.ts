import type { ErrorCode, Path } from "../check/codes"
import type { CashflowBreakdown } from "./breakdown"
import type { AccountId, DateString, MinorUnits } from "./common"
import type { EstateStatement } from "./estate"
import type { MilestoneResult } from "./milestone"
import type { SpendingRuleStatement } from "./rule"
import type { LiabilityStatement } from "./statement"

export interface AccountAmount {
	readonly account: AccountId
	readonly amount: MinorUnits
}

/** One Account's value in a row: `capitalised + accruedInterest = amount`. */
export interface ProjectionBalance {
	readonly account: AccountId
	readonly amount: MinorUnits
	readonly capitalised: MinorUnits
	readonly accruedInterest: MinorUnits
}

export interface ProjectionRow {
	readonly date: DateString
	readonly balances: readonly ProjectionBalance[]
	readonly netWorth: MinorUnits
	readonly accessibleNetWorth: MinorUnits
	readonly realBalances: readonly ProjectionBalance[]
	readonly realNetWorth: MinorUnits
	readonly realAccessibleNetWorth: MinorUnits
}

export interface AnnualRollup {
	readonly index: number
	readonly from: DateString
	readonly to: DateString
	readonly openingNetWorth: MinorUnits
	readonly closingNetWorth: MinorUnits
	readonly income: MinorUnits
	readonly expense: MinorUnits
	readonly contributions: MinorUnits
	/**
	 * Employer Contributions landed in Accounts in the period; present only when the Scenario declares one.
	 * Not in `income` or `contributions`, and not part of `interest`: the money never entered cashflow.
	 */
	readonly employerContributions?: MinorUnits
	/**
	 * Payouts landed as passive income in the period; present only when the Scenario declares a payout
	 * with a share above 0. Already inside `income`, and outside `interest`: they left the Account.
	 */
	readonly payouts?: MinorUnits
	/**
	 * Fees charged to Accounts in the period; present only when an Account carries a fee above 0 bps.
	 * The money left an Account and went nowhere: it is in no cashflow, and not in `interest`, which is
	 * growth before the fee.
	 */
	readonly fees?: MinorUnits
	/** What each fee Account was charged in the period, in Scenario order; present with `fees`. */
	readonly accountFees?: readonly AccountAmount[]
	readonly unfundedContributions: MinorUnits
	/** Prepayment plus Settlements net of refunds; present only when the Scenario has a Levy. */
	readonly levy?: MinorUnits
	/**
	 * Planned withdrawals landed in the period, borrowed from liabilities; present only when the Scenario
	 * declares a withdrawal Flow. A withdrawal that lands as cash leaves net worth unchanged, so it is not
	 * part of `interest`.
	 */
	readonly withdrawals?: MinorUnits
	/**
	 * Money moved between the plan's own Accounts by transfer Flows in the period; present only when the
	 * Scenario declares one (ADR 0031). Outside cashflow and net worth: it is in no other figure here.
	 */
	readonly transfers?: MinorUnits
	readonly interest: MinorUnits
	readonly unmet: MinorUnits
	readonly partial: boolean
}

export interface RunsOut {
	readonly date: DateString
	readonly unmet: MinorUnits
}

export interface LevyMeasureValue {
	readonly id: string
	readonly value: MinorUnits
}

export interface SettlementPeriod {
	readonly from: DateString
	readonly to: DateString
	readonly settlementDate: DateString
	readonly measures: readonly LevyMeasureValue[]
	readonly prepaid: MinorUnits
	readonly due: MinorUnits
	readonly settlement: MinorUnits
	readonly settled: boolean
	readonly partial: boolean
}

export interface LevyReport {
	readonly id: string
	readonly periods: readonly SettlementPeriod[]
}

export interface Projection {
	readonly rows: readonly ProjectionRow[]
	readonly annual: readonly AnnualRollup[]
	readonly unfundedContributions: readonly AccountAmount[]
	readonly runsOut?: RunsOut
	readonly levies?: readonly LevyReport[]
	/** Scenario order; present only when the Scenario declares Milestones. */
	readonly milestones?: readonly MilestoneResult[]
	/** One statement per liability in Scenario order; present only with `liabilityStatements`. */
	readonly liabilities?: readonly LiabilityStatement[]
	/** One per Annual roll-up in order; present only with `cashflowBreakdown`. */
	readonly cashflow?: readonly CashflowBreakdown[]
	/** One statement per rule Flow in Scenario order; present only with `spendingRules`. */
	readonly spendingRules?: readonly SpendingRuleStatement[]
	/** One statement per row in order; present only with `estate`. */
	readonly estate?: readonly EstateStatement[]
}

export interface InputProblem {
	readonly code: ErrorCode
	readonly path: Path
	/** The Occurrence date, for a problem the engine finds at run time. */
	readonly date?: DateString
}

export interface ValueOverflowProblem {
	readonly code: "VALUE_OVERFLOW"
	readonly date: DateString
	readonly account?: AccountId
}

export type ProjectionProblem = InputProblem | ValueOverflowProblem

export type ProjectionResult =
	| { readonly ok: true; readonly projection: Projection }
	| { readonly ok: false; readonly problems: readonly ProjectionProblem[] }
