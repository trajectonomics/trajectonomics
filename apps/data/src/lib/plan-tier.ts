import { tierOn } from "@trajectonomics/data-collector/plans"

/** The tier the site shows beside a plan's name, and the remark behind its tooltip. */
export type PlanTierLabel = {
	name: string
	note: string | null
}

/**
 * The tier a plan ran on at the end of the window, or null when the table does not know one or
 * the day falls before the tier began.
 */
export function planTier(plan: string, day: string): PlanTierLabel | null {
	const tier = tierOn(plan, day)
	if (tier === null) return null
	return { name: tier.name, note: tier.note ?? null }
}
