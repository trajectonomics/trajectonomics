import { isSafeInteger, overflow } from "../engine/overflow"
import type { EngineRun } from "../engine/result"
import type { Scenario } from "../types"
import type { CashflowBreakdown } from "../types/breakdown"
import type { ProjectionProblem } from "../types/projection"
import { categoryTotals } from "./cashflow-flows"
import { breakdownOf } from "./cashflow-lines"
import { sumPeriod } from "./cashflow-sums"
import type { Period } from "./periods"

export interface CashflowOutcome {
	/** The `cashflow` key of the Projection; absent without the breakdown option. */
	readonly fields: { readonly cashflow?: readonly CashflowBreakdown[] }
	readonly problem: ProjectionProblem | undefined
}

/** One cash-flow breakdown per Annual roll-up, the same periods the roll-ups use. */
export function buildCashflow(
	run: EngineRun,
	periods: readonly Period[],
	scenario: Scenario,
	breakdown: boolean,
): CashflowOutcome {
	if (!breakdown) return { fields: {}, problem: undefined }
	const cashflow: CashflowBreakdown[] = []
	for (const period of periods) {
		const sums = sumPeriod(run.totals, period)
		const unmet = run.runsOut?.date === period.to ? run.runsOut.unmet : 0n
		const categories = categoryTotals(scenario.flows, sums.planned)
		const values = [
			...sums.planned.values(),
			...sums.applied.values(),
			...sums.unfunded.values(),
			...sums.prepaid.values(),
			...sums.settled.values(),
			...sums.drawn.values(),
			...sums.surplus.values(),
			...categories.map((item) => item.amount),
			unmet,
		]
		if (!values.every(isSafeInteger)) return { fields: {}, problem: overflow(period.to) }
		cashflow.push(breakdownOf(scenario, period, sums, categories, unmet))
	}
	return { fields: { cashflow }, problem: undefined }
}
