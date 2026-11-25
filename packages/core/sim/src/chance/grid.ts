import { buildPeriods, type Period, periodEndDates } from "../output/periods"
import type { DateString, Timeline } from "../types"

/** The Annual roll-up periods of a Timeline, in order: the one grid every Market path reports on. */
export function rollupGrid(timeline: Timeline): readonly Period[] {
	return buildPeriods(timeline.start, timeline.horizon, undefined)
}

/** The dates every Market path is snapshotted at: each roll-up end, and the horizon itself. */
export function rollupObservations(timeline: Timeline): readonly DateString[] {
	return [...periodEndDates(timeline.start, timeline.horizon), timeline.horizon]
}
