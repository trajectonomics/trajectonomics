import type { ProjectionRun } from "../../contract"
import { formatMonth } from "../../format"
import { ruleYearsOf } from "./years"

/** What the Home card says: the first Rule year's amount, its month and its share of the savings. */
export interface WithdrawalsSummary {
	readonly amount: string
	readonly share: string | null
	/** The first Rule year's month, such as "Jun 2050". */
	readonly month: string
	readonly currency: string
}

/** The card's figures, or null when the plan states no rule year (no rule Flow, or it never starts inside the horizon). */
export function withdrawalsSummaryOf(run: ProjectionRun): WithdrawalsSummary | null {
	const first = ruleYearsOf(run)[0]?.rows[0]
	if (first === undefined) return null
	return {
		amount: first.amount,
		share: first.share,
		month: formatMonth(first.date),
		currency: run.currency,
	}
}
