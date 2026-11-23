import type { ProjectionRun } from "../../contract"
import { ruleYearsOf } from "./years"

/** What the Home card says: the first Rule year's amount and its share of the savings. */
export interface WithdrawalsSummary {
	readonly amount: string
	readonly share: string | null
	readonly from: string
	readonly currency: string
}

/** The card's figures, or null when the plan states no rule year (no rule Flow, or it never starts inside the horizon). */
export function withdrawalsSummaryOf(run: ProjectionRun): WithdrawalsSummary | null {
	const first = ruleYearsOf(run)[0]?.rows[0]
	if (first === undefined) return null
	return { amount: first.amount, share: first.share, from: first.from, currency: run.currency }
}
