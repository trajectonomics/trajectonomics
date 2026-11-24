import type { AccountId, DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { type Totals, takeFlow } from "./aggregate-take"
import type { ContributionEntry } from "./contribution-entries"
import type { Planned } from "./derive"
import type { DatedEvent } from "./events"
import type { SettlementPeriodView } from "./levy-shares"
import { occurrenceAmount } from "./occurrence-amount"
import type { TransferEntry } from "./transfer-entry"

export { occurrenceAmount } from "./occurrence-amount"
export type { ContributionEntry }

export interface DayFlows {
	/** Planned gross income before Prepayment. */
	readonly income: bigint
	readonly expense: bigint
	readonly contributionEntries: readonly ContributionEntry[]
	/** Planned withdrawals on this date, by the liability each one borrows from. */
	readonly plannedBySource: ReadonlyMap<AccountId, bigint>
	/** Planned withdrawals on this date, summed. Not income and not Available cashflow. */
	readonly withdrawals: bigint
	/** Transfers on this date, in the order their Flows landed: outside cashflow, so in no sum (ADR 0031). */
	readonly transfers: readonly TransferEntry[]
	/** Planned gross income by Tally label. */
	readonly gross: ReadonlyMap<string, bigint>
	readonly prepaid: bigint
	/** Employer Contributions landed on this date, summed; never part of income or Available cashflow. */
	readonly employer: bigint
	/** Payouts landed on this date, once they have left their Accounts: inside `income` (ADR 0027). */
	readonly payouts?: bigint
	/** Each Levy's own Prepayment share. */
	readonly prepaidByLevy: ReadonlyMap<string, bigint>
	/** A capped Prepayment read a cap that is not a safe integer. */
	readonly problem?: ProjectionProblem
}

/** Sums one Occurrence's flows, separating Prepayment and Tally labels from the cash amounts. */
export function aggregate(
	events: readonly DatedEvent[],
	planned: Planned,
	views: readonly SettlementPeriodView[],
	date: DateString,
): DayFlows {
	const totals: Totals = {
		income: 0n,
		expense: 0n,
		prepaid: 0n,
		employer: 0n,
		gross: new Map(),
		prepaidByLevy: new Map(),
		contributionEntries: [],
		plannedBySource: new Map(),
		transfers: [],
		withdrawals: 0n,
	}
	for (const event of events) {
		const amount = occurrenceAmount(event, planned)
		const problem = takeFlow(totals, event.flow, amount, views, date)
		if (problem !== undefined) return { ...totals, problem }
	}
	return totals
}
