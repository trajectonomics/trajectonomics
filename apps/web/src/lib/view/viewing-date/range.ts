/**
 * The months a Snapshot lets a person view, and the one its address asks for (web ADR 0033). The range comes from
 * the Snapshot's parameters only, never from its Reads or the plan.
 */
import type { SnapshotParams } from "../../contract"
import { addMonthsTo, monthOf, monthsBetween, parseMonth } from "./month"

/** The first month, the As-of month and the last month a page may show. */
export interface ViewingRange {
	readonly first: string
	readonly asOf: string
	readonly last: string
}

/** The range of a Snapshot: its first history month (or the As-of month with no history) to its horizon month (or the As-of month with no plans). */
export function viewingRange(params: SnapshotParams): ViewingRange {
	const asOf = monthOf(params.asOf)
	const first =
		params.historyDates.length === 0 ? asOf : monthOf(params.historyDates[0] ?? params.asOf)
	const last = params.scenarios.length === 0 ? asOf : monthOf(params.horizon)
	return { first, asOf, last }
}

/** The month an address asks for, clamped to the range: a month outside it reads as its nearest end, and an invalid text as the As-of month. */
export function viewingMonth(raw: string, range: ViewingRange): string {
	const month = parseMonth(raw)
	if (month === null) return range.asOf
	if (month < range.first) return range.first
	if (month > range.last) return range.last
	return month
}

/** What the address holds for a month: nothing for the As-of month, which the address leaves out, and the month otherwise. */
export function atParam(month: string, range: ViewingRange): string {
	return month === range.asOf ? "" : month
}

/** How many months a month is after the range's first: 0 for the first month itself. */
export function monthIndex(month: string, range: ViewingRange): number {
	return monthsBetween(range.first, month)
}

/** The month an index of the range reads, counted from its first month. */
export function monthAt(index: number, range: ViewingRange): string {
	return addMonthsTo(range.first, index)
}

/** How many months the range holds, both ends counted. */
export function monthCount(range: ViewingRange): number {
	return monthsBetween(range.first, range.last) + 1
}
