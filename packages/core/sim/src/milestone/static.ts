import { addMonthsClamped } from "../calendar/arith"
import { landedDate, type ResolvedCalendar } from "../calendar/business"
import type { Criterion, DateString, Milestone } from "../types"

/** The date a criterion holds from, when every Milestone it names has a known fire date. */
function criterionDate(
	criterion: Criterion,
	fires: ReadonlyMap<string, DateString>,
): DateString | undefined {
	if (criterion.kind === "date") return criterion.on
	if (criterion.kind !== "milestone") return undefined
	const fired = fires.get(criterion.milestone)
	return fired === undefined ? undefined : addMonthsClamped(fired, criterion.months)
}

/**
 * A static Milestone's fire date: the latest criterion date for `all`, the earliest for `any`,
 * moved forward to a Landed date. Dates are `YYYY-MM-DD`, so string order is date order.
 */
export function staticFire(
	milestone: Milestone,
	fires: ReadonlyMap<string, DateString>,
	calendar: ResolvedCalendar | undefined,
): DateString | undefined {
	const dates: DateString[] = []
	for (const criterion of milestone.criteria) {
		const date = criterionDate(criterion, fires)
		if (date === undefined) return undefined
		dates.push(date)
	}
	const sorted = [...dates].sort()
	const combined = milestone.combine === "all" ? sorted[sorted.length - 1] : sorted[0]
	return combined === undefined ? undefined : landedDate(combined, calendar)
}
