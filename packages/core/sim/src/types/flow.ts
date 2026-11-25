import type {
	AccountId,
	BasisPoints,
	DateString,
	Frequency,
	Funding,
	Growth,
	MinorUnits,
} from "./common"
import type { Derive, Rounding } from "./measure"
import type { RuledAmount } from "./rule"

/** One Levy's share of an income Occurrence, in basis points of the gross. */
export interface Prepayment {
	readonly levy: string
	readonly bps: BasisPoints
}

/** A second, Levy-capped share; `upTo` is a `const` Measure of the named Levy. */
export interface CappedPrepayment {
	readonly levy: string
	readonly bps: BasisPoints
	readonly upTo: string
}

interface FlowBase {
	readonly id: string
	/** What a person reads in place of the id, 1 to 80 code points (sim ADR 0032). Never a key, never read by the engine. */
	readonly displayLabel?: string
	readonly frequency: Frequency
	readonly start: DateString
	/** Omitted means the flow runs to `Timeline.horizon`. A `once` flow omits it or equals `start`. */
	readonly end?: DateString
	/** A Milestone id: the Flow lands only on or after that Milestone's fire date. */
	readonly startAt?: string
	/** A Milestone id: the Flow lands only strictly before that Milestone's fire date. */
	readonly endAt?: string
}

/** A fixed amount, grown by whole annual steps from the Flow's start. */
export interface FixedAmount {
	readonly amount: MinorUnits
	readonly growth: Growth
}

/** An amount computed per Occurrence from a Measure graph over other Flows. */
export interface DerivedAmount {
	readonly derive: Derive
}

/** The loan a level payment pays off: `payments` equal payments of `principal` at the target's nominal rate. */
export interface LevelLoan {
	/** The amount borrowed, as the caller states it, in minor units. */
	readonly principal: MinorUnits
	/** The number of payments, a positive safe integer within the calendar's periods. */
	readonly payments: number
	/** How the one exact payment is rounded to a minor unit. Required; no default. */
	readonly rounding: Rounding
}

/** A level payment computed once from a loan; it does not grow. */
export interface LevelAmount {
	readonly level: LevelLoan
}

export interface IncomeRules {
	readonly kind: "income"
	/** Earned (true) versus passive (false) income. */
	readonly earned: boolean
	/** Tally label a Levy sums over; without one the Flow is never tallied. Needs a Levy. */
	readonly label?: string
	/** Shares of each Occurrence taken at source, one per Levy. Needs a Levy. */
	readonly prepayments?: readonly Prepayment[]
	/** A share on the part of each Occurrence below a cap on the label's period-to-date gross. */
	readonly cappedPrepayment?: CappedPrepayment
}

export interface ExpenseRules {
	readonly kind: "expense"
	/** Free-text grouping for reports, 1 to 64 characters. The engine never reads it: no figure changes. */
	readonly category?: string
}

/**
 * Cash moves into `target`. A liability target is a debt payment capped at the amount owed; an asset
 * target spends Available cashflow in `cashflow.contribute` order, unless `funding` is `obligation`:
 * then it is paid in full, drawing on savings if the day's cash is short (a purchase, ADR 0021). With
 * `funding` `employer` it lands in a liquid asset from outside the household's cash (ADR 0026).
 */
export interface ContributionRules {
	readonly kind: "contribution"
	readonly target: AccountId
	/** An asset target only: `target` (absent means the same), `obligation` or `employer`. Refused on a liability. */
	readonly funding?: Funding
	/** Tally label a Levy sums over; without one the Flow is never tallied. Needs a Levy. */
	readonly label?: string
}

export type IncomeFlow = FlowBase & IncomeRules & (FixedAmount | DerivedAmount)
export type ExpenseFlow = FlowBase & ExpenseRules & (FixedAmount | DerivedAmount | RuledAmount)
/**
 * Cash moves into cashflow on each Landed date; it is not income. A liability `source` borrows (the
 * amount owed grows); an asset `source` is sold (`min(planned, value)` leaves it, ADR 0021).
 */
export interface WithdrawalRules {
	readonly kind: "withdrawal"
	readonly source: AccountId
}

/**
 * Money moves from `source` to `target`, both the plan's own Accounts, outside cashflow (ADR 0031): it is
 * not income, an expense or a Contribution, and net worth is unchanged on its date. The amount moved is
 * `min(planned, what the source holds, what a liability target still owes)`, none while the source is locked.
 * Cost basis moves with the money; `realise` tallies the source's Realised gain on it as a sale's.
 */
export interface TransferRules {
	readonly kind: "transfer"
	/** An asset Account that is not Illiquid. */
	readonly source: AccountId
	/** An asset Account, or a liability the transfer pays down. */
	readonly target: AccountId
	/** Tally the Realised gain on the amount moved, as a sale; absent or `false` moves the Cost basis untaxed. */
	readonly realise?: boolean
}

export type ContributionFlow = FlowBase &
	ContributionRules &
	(FixedAmount | DerivedAmount | LevelAmount)
export type WithdrawalFlow = FlowBase & WithdrawalRules & (FixedAmount | DerivedAmount)

export type TransferFlow = FlowBase & TransferRules & (FixedAmount | DerivedAmount)

export type Flow = IncomeFlow | ExpenseFlow | ContributionFlow | WithdrawalFlow | TransferFlow

/** Whether a Flow carries a fixed `amount` rather than a `derive` graph or a `level` loan. */
export function isFixed(flow: Flow): flow is Flow & FixedAmount {
	return "amount" in flow
}

/** Whether a Flow carries a `level` loan payment rather than an `amount` or `derive`. */
export function isLevel(flow: Flow): flow is Flow & LevelAmount {
	return "level" in flow
}

/** Whether a Flow carries a Spending `rule` rather than an `amount`, `derive` or `level`. */
export function isRuled(flow: Flow): flow is Flow & RuledAmount {
	return "rule" in flow
}

/** Whether a Flow carries a `derive` graph rather than a fixed `amount`. */
export function isDerived(flow: Flow): flow is Flow & DerivedAmount {
	return "derive" in flow
}
