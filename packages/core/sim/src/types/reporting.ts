import type {
	AccountLine,
	CategoryLine,
	ContributionLine,
	DrawnLine,
	EmployerLine,
	ExpenseLine,
	FlowLine,
	LevyLine,
	PayoutLine,
	TransferLine,
	WithdrawalLine,
} from "./breakdown"
import type { DateString, MinorUnits } from "./common"

/**
 * What a caller asks the Projection to state per Reporting year and Reporting month (ADR 0034). Without
 * it, or with `years` not `true` and `monthsOf` absent, the Projection gains no key and changes no byte.
 */
export interface ReportingOptions {
	/** The month, 1 (January) to 12 (December), on whose 1st each Reporting year begins. */
	readonly yearStart: number
	/** States `Projection.cashflowYears`, one breakdown per Reporting year. */
	readonly years?: boolean
	/**
	 * States `Projection.cashflowMonths`: the Reporting months of one Reporting year, named by the calendar
	 * year it begins in; `"first"` is the Reporting year that holds `Timeline.start`, `"all"` is every one.
	 */
	readonly monthsOf?: number | "first" | "all"
}

/** One Reporting year or Reporting month of a Projection, cut at both ends. */
export interface ReportingSpan {
	readonly year: number
	readonly from: DateString
	readonly to: DateString
	readonly partial: boolean
}

/** The Reporting years of a Timeline's horizon for one year start, known before the run. */
export interface ReportingYearRange {
	readonly first: number
	readonly last: number
}

/** Every line list of a Cash-flow breakdown, with no span (ADR 0018, 0027, 0031). */
export interface CashflowLines {
	readonly income: readonly FlowLine[]
	readonly prepaid: readonly LevyLine[]
	readonly settlements: readonly LevyLine[]
	readonly expenses: readonly ExpenseLine[]
	readonly categories: readonly CategoryLine[]
	readonly contributions: readonly ContributionLine[]
	/**
	 * Employer money into Accounts, by Flow; present only when the Scenario declares an employer
	 * Contribution. Kept out of the identity: it never entered cashflow, so money in still equals money out.
	 */
	readonly employer?: readonly EmployerLine[]
	/**
	 * Payouts by Account, in Scenario order; present only when the Scenario declares a payout. Money in:
	 * `income` lists the declared income Flows, so the identity adds `Σpayouts` to its money in.
	 */
	readonly payouts?: readonly PayoutLine[]
	readonly withdrawals: readonly WithdrawalLine[]
	/**
	 * Transfers by Flow, in Scenario order; present only when the Scenario declares a transfer (ADR 0031). Money
	 * moved between the plan's own Accounts: outside the identity, which it enters on neither side.
	 */
	readonly transfers?: readonly TransferLine[]
	readonly drawn: readonly DrawnLine[]
	readonly surplus: readonly AccountLine[]
	readonly unmet: MinorUnits
}

/** A Cash-flow breakdown over one Reporting year or Reporting month. */
export interface ReportingCashflow extends CashflowLines {
	readonly year: number
	readonly from: DateString
	readonly to: DateString
	readonly partial: boolean
}
