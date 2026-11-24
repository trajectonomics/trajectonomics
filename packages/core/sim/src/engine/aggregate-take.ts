import type { AccountId, DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { addTo } from "./add"
import type { ContributionEntry } from "./contribution-entries"
import type { DatedEvent } from "./events"
import { addIncome } from "./levy-prepaid"
import type { SettlementPeriodView } from "./levy-shares"
import type { TransferEntry } from "./transfer-entry"

export interface Totals {
	income: bigint
	expense: bigint
	prepaid: bigint
	employer: bigint
	readonly gross: Map<string, bigint>
	readonly prepaidByLevy: Map<string, bigint>
	readonly contributionEntries: ContributionEntry[]
	readonly plannedBySource: Map<AccountId, bigint>
	readonly transfers: TransferEntry[]
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
export function takeFlow(
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
	} else if (flow.kind === "transfer") {
		const { source, target, realise = false } = flow
		totals.transfers.push({ flow: flow.id, source, target, amount, realise })
	} else {
		const employer = flow.funding === "employer"
		if (employer) totals.employer += amount
		totals.contributionEntries.push({
			flow: flow.id,
			target: flow.target,
			amount,
			label: flow.label,
			obligation: flow.funding === "obligation",
			employer,
		})
	}
	return undefined
}
