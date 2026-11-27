import { plans } from "@trajectonomics/data-collector/plans"

const ORDER = new Map(plans.map((plan, index) => [plan.id as string, index]))

/** The plan table's display name for an id, or the id itself when the table has no entry. */
export function planName(plan: string): string {
	return plans.find((entry) => entry.id === plan)?.name ?? plan
}

/** The plan table's order, so every list puts plans in the same sequence. */
export function planRank(plan: string): number {
	return ORDER.get(plan) ?? plans.length
}

/** Orders two entries by the plan table, then by plan id for plans the table does not name. */
export function comparePlans(a: { plan: string }, b: { plan: string }): number {
	return planRank(a.plan) - planRank(b.plan) || a.plan.localeCompare(b.plan)
}
