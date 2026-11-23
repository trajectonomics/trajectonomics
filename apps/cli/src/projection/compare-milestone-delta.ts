import type { MilestoneResult } from "@trajectonomics/core/sim"
import type { MilestoneDelta } from "./compare-view"
import { monthsBetween } from "./dates"

/** The date a Milestone fired on, or null when it did not fire. */
function firedOn(milestone: MilestoneResult | undefined): string | null {
	return milestone?.reached === true ? milestone.date : null
}

/**
 * One row per Milestone id declared on both sides, in side `a`'s order. `months` is the calendar months
 * from a's date to b's (`monthsBetween`: month boundaries crossed, so a one-day move across a month end
 * is 1), null when either side did not reach it. An id on one side
 * only is not listed: its row is under that side's own `milestones` (cli ADR-0049, amended).
 */
export function milestoneDeltasOf(
	a: readonly MilestoneResult[],
	b: readonly MilestoneResult[],
): MilestoneDelta[] {
	const byId = new Map(b.map((milestone) => [milestone.id, milestone]))
	return a.flatMap((milestoneA) => {
		const milestoneB = byId.get(milestoneA.id)
		if (milestoneB === undefined) return []
		const dateA = firedOn(milestoneA)
		const dateB = firedOn(milestoneB)
		return [
			{
				id: milestoneA.id,
				a: dateA,
				b: dateB,
				months: dateA === null || dateB === null ? null : monthsBetween(dateA, dateB),
			},
		]
	})
}
