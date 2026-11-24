import { declaresEmployer } from "../engine/employer"
import { declaresTransfers } from "../loan/resolve"
import { declaresPayouts, isPayout } from "../payout/flows"
import type { MinorUnits, Scenario } from "../types"
import type {
	AccountLine,
	CashflowBreakdown,
	CategoryLine,
	FlowLine,
	LevyLine,
} from "../types/breakdown"
import { drawnLines } from "./cashflow-drawn"
import {
	type CategoryTotal,
	contributionLines,
	employerLines,
	expenseLines,
	ofKind,
	payoutLines,
	transferLines,
	withdrawalLines,
} from "./cashflow-flows"
import type { PeriodSums } from "./cashflow-sums"
import type { Period } from "./periods"

/** One line per id in order, skipping ids whose amount is zero over the period. */
export function lines<T>(
	ids: readonly string[],
	amounts: ReadonlyMap<string, bigint>,
	make: (id: string, amount: MinorUnits) => T,
): T[] {
	const out: T[] = []
	for (const id of ids) {
		const amount = amounts.get(id) ?? 0n
		if (amount !== 0n) out.push(make(id, Number(amount)))
	}
	return out
}

/** The breakdown of one period, from its sums; every amount is a sum the engine applied. */
export function breakdownOf(
	scenario: Scenario,
	period: Period,
	sums: PeriodSums,
	categories: readonly CategoryTotal[],
	unmet: bigint,
): CashflowBreakdown {
	const levyIds = (scenario.levies ?? []).map((levy) => levy.id)
	const incomeIds = ofKind(scenario.flows, "income")
		.filter((flow) => !isPayout(flow))
		.map((flow) => flow.id)
	const levyLine = (levy: string, amount: MinorUnits): LevyLine => ({ levy, amount })
	const flowLine = (flow: string, amount: MinorUnits): FlowLine => ({ flow, amount })
	const accountLine = (account: string, amount: MinorUnits): AccountLine => ({ account, amount })
	return {
		index: period.index,
		from: period.from,
		to: period.to,
		income: lines(incomeIds, sums.planned, flowLine),
		prepaid: lines(levyIds, sums.prepaid, levyLine),
		settlements: lines(levyIds, sums.settled, levyLine),
		expenses: expenseLines(scenario.flows, sums.planned),
		categories: categories.map(
			(item): CategoryLine => ({ category: item.category, amount: Number(item.amount) }),
		),
		contributions: contributionLines(scenario.flows, sums),
		...(declaresEmployer(scenario) ? { employer: employerLines(scenario.flows, sums) } : {}),
		...(declaresPayouts(scenario) ? { payouts: payoutLines(scenario.flows, sums) } : {}),
		withdrawals: withdrawalLines(scenario.flows, sums.planned),
		...(declaresTransfers(scenario) ? { transfers: transferLines(scenario.flows, sums) } : {}),
		drawn: drawnLines(scenario.cashflow.withdraw, sums.drawn),
		surplus: lines(
			scenario.cashflow.surplus.map((step) => step.account),
			sums.surplus,
			accountLine,
		),
		unmet: Number(unmet),
	}
}
