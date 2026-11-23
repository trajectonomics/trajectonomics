import type { AccountId, DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { addTo } from "./add"
import type { Planned } from "./derive"
import type { DatedEvent } from "./events"
import { addIncome } from "./levy-prepaid"
import type { SettlementPeriodView } from "./levy-shares"

export interface ContributionEntry {
	/** The contribution Flow's id, so a breakdown can split the Account's amount back to Flows. */
	readonly flow: string
	readonly target: AccountId
	readonly amount: bigint
	readonly label: string | undefined
	/** Paid in full, outside Available cashflow, instead of capped by it (ADR 0021). */
	readonly obligation: boolean
}

export interface DayFlows {
	/** Planned gross income before Prepayment. */
	readonly income: bigint
	readonly expense: bigint
	readonly contributionEntries: readonly ContributionEntry[]
	/** Planned withdrawals on this date, by the liability each one borrows from. */
	readonly plannedBySource: ReadonlyMap<AccountId, bigint>
	/** Planned withdrawals on this date, summed. Not income and not Available cashflow. */
	readonly withdrawals: bigint
	/** Planned gross income by Tally label. */
	readonly gross: ReadonlyMap<string, bigint>
	readonly prepaid: bigint
	/** Each Levy's own Prepayment share. */
	readonly prepaidByLevy: ReadonlyMap<string, bigint>
	/** A capped Prepayment read a cap that is not a safe integer. */
	readonly problem?: ProjectionProblem
}

interface Totals {
	income: bigint
	expense: bigint
	prepaid: bigint
	readonly gross: Map<string, bigint>
	readonly prepaidByLevy: Map<string, bigint>
	readonly contributionEntries: ContributionEntry[]
	readonly plannedBySource: Map<AccountId, bigint>
	withdrawals: bigint
}

function takeIncome(
	totals: Totals,
	flow: Extract<DatedEvent["flow"], { kind: "income" }>,
	amount: bigint,
	views: readonly SettlementPeriodView[],
	date: DateString,
): ProjectionProblem | undefined {
	totals.income += amount
	const taken = addIncome(flow, amount, totals.gross, views, date)
	for (const [levy, share] of taken.byLevy) {
		totals.prepaidByLevy.set(levy, (totals.prepaidByLevy.get(levy) ?? 0n) + share)
	}
	totals.prepaid += taken.prepaid
	return taken.problem
}

/** Adds one Occurrence's amount to the day's totals under the kind of its Flow. */
function takeFlow(
	totals: Totals,
	flow: DatedEvent["flow"],
	amount: bigint,
	views: readonly SettlementPeriodView[],
	date: DateString,
): ProjectionProblem | undefined {
	if (flow.kind === "income") return takeIncome(totals, flow, amount, views, date)
	if (flow.kind === "expense") totals.expense += amount
	else if (flow.kind === "withdrawal") {
		addTo(totals.plannedBySource, flow.source, amount)
		totals.withdrawals += amount
	} else
		totals.contributionEntries.push({
			flow: flow.id,
			target: flow.target,
			amount,
			label: flow.label,
			obligation: flow.funding === "obligation",
		})
	return undefined
}

/** The amount one Occurrence lands: a fixed Flow's grown amount, its rule's part, or its Derived amount for the date. */
export function occurrenceAmount(event: DatedEvent, planned: Planned): bigint {
	return event.amount ?? planned.ruled?.get(event) ?? planned.derived.get(event.flow.id) ?? 0n
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
		gross: new Map(),
		prepaidByLevy: new Map(),
		contributionEntries: [],
		plannedBySource: new Map(),
		withdrawals: 0n,
	}
	for (const event of events) {
		const amount = occurrenceAmount(event, planned)
		const problem = takeFlow(totals, event.flow, amount, views, date)
		if (problem !== undefined) return { ...totals, problem }
	}
	return totals
}
