import { addMonthsClamped } from "../calendar/arith"
import { countedDays } from "../calendar/counted"
import type { DateString, Timeline } from "../types"

export const MAX_MARKET_ROWS = 1200

function monthStart(date: DateString): DateString {
	return `${date.slice(0, 7)}-01`
}

/**
 * One Market row per month from the Timeline start to its horizon, one month start each; the
 * last window ends at the horizon. Returns at most `MAX_MARKET_ROWS + 1` dates so a caller can
 * detect an over-long Timeline instead of silently truncating it.
 */
export function marketRowDates(timeline: Timeline): readonly DateString[] {
	const dates: DateString[] = []
	let date = timeline.start
	while (date < timeline.horizon && dates.length <= MAX_MARKET_ROWS) {
		dates.push(date)
		date = addMonthsClamped(monthStart(date), 1)
	}
	return dates
}

/** A Market row's start, and the counted days of the whole month its return is stated over. */
export interface MarketRow {
	readonly from: DateString
	readonly span: number
}

/**
 * The Market rows of a Timeline. The first row starts at the Timeline start and the last ends at
 * the horizon, so either may hold only part of its month: its `span` is the whole month, so the
 * row takes the same share of the month's return as it holds of the month's days (ADR 0005).
 */
export function marketRows(timeline: Timeline): readonly MarketRow[] {
	return marketRowDates(timeline).map((from) => {
		const first = monthStart(from)
		return { from, span: countedDays(first, addMonthsClamped(first, 1)) }
	})
}
