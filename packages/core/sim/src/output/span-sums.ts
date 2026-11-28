import type { DayTotals } from "../engine/occurrence"
import type { DateString } from "../types"
import { addLines, emptySums, type PeriodSums } from "./cashflow-sums"

/** One span's days, both ends inclusive. */
export interface SpanDates {
	readonly from: DateString
	readonly to: DateString
}

/**
 * Sums each span's DayTotals in one pass: the days come in date order and a cursor walks the spans in
 * order, so `"all"` over a long horizon walks the days once, not once per month (ADR 0034).
 */
export function sumSpans(totals: readonly DayTotals[], spans: readonly SpanDates[]): PeriodSums[] {
	const sums = spans.map(() => emptySums())
	let cursor = 0
	for (const total of totals) {
		if (total.lines === undefined) continue
		while (cursor < spans.length && total.date > spans[cursor]!.to) cursor++
		const span = spans[cursor]
		if (span === undefined) break
		if (total.date < span.from) continue
		addLines(sums[cursor]!, total.lines)
	}
	return sums
}
