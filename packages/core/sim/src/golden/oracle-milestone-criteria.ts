import type { Criterion, DateString, MetricName } from "../types"

/** The two balances a Milestone reads: accessible (the liquid cash) and net (with the marked ones). */
export interface Opening {
	readonly accessible: number
	readonly net: number
}

/** The named balances the oracle reads: net worth adds the marked Accounts to the liquid cash. */
const METRIC: Partial<Record<MetricName, (opening: Opening) => number>> = {
	netWorth: (opening) => opening.net,
	accessibleNetWorth: (opening) => opening.accessible,
}

export function holds(criterion: Criterion, date: DateString, opening: Opening): boolean {
	if (criterion.kind === "date") return date >= criterion.on
	if (criterion.kind !== "metric" || typeof criterion.metric !== "string") {
		throw new Error("the oracle takes date and named metric criteria only")
	}
	const read = METRIC[criterion.metric]
	if (read === undefined) throw new Error("the oracle reads netWorth and accessibleNetWorth only")
	const amount = read(opening)
	return criterion.op === "atLeast" ? amount >= criterion.amount : amount <= criterion.amount
}
