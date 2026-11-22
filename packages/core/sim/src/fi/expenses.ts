import { addMonthsClamped } from "../calendar/arith"
import type { ResolvedCalendar } from "../calendar/business"
import type { DateString, Timeline } from "../types"
import type { SurvivalOptions } from "../types/financial-independence"
import type { WindowOutcome } from "./expense-window"
import { buildWindow, expenseBetween } from "./expense-window"
import { retirementMeasurements } from "./retirement-spending"

const LAST_SUPPORTED_DATE = "9998-12-31"

export type { ExpenseWindow, Measured, WindowOutcome } from "./expense-window"
export { expenseBetween }

/** The date a window reads to: a full extra year past the horizon, within the supported years. */
export function windowThrough(timeline: Timeline): DateString {
	const extended = addMonthsClamped(timeline.horizon, 12)
	return extended > LAST_SUPPORTED_DATE ? LAST_SUPPORTED_DATE : extended
}

/**
 * The retirement-spending window from the first candidate through `windowThrough`. It replaces the
 * planned expenses, so no Milestone and no candidate changes it.
 */
export function retirementWindow(
	timeline: Timeline,
	retirement: NonNullable<SurvivalOptions["retirementSpending"]>,
	firstCandidate: DateString,
	inflation: number,
	calendar: ResolvedCalendar | undefined,
): WindowOutcome {
	const measurements = retirementMeasurements(
		timeline,
		retirement,
		firstCandidate,
		windowThrough(timeline),
		inflation,
		calendar,
	)
	return { ok: true, window: buildWindow(measurements) }
}
