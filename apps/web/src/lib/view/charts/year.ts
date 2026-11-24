import { dayNumber } from "../../chart"
import type { ProjectionRun } from "../../contract"
import { formatDate } from "../../format"
import { annualRowsOf } from "../projection/annual"
import type { Period, Pt } from "./types"

/**
 * A point at the day its period ends, carrying the CLI's string untouched. The x is that day counted as
 * a whole number, so a part-year period sits where it ends and no period is moved or dropped.
 */
export function pointAt(date: string, amount: string, period: Period | null = null): Pt {
	return { x: dayNumber(date), label: formatDate(date), date, amount, period }
}

/** The annual rows' periods by the day they end: where a figure stated on a date finds the period it closes. */
export function periodsOf(run: ProjectionRun): ReadonlyMap<string, Period> {
	return new Map(
		annualRowsOf(run).map((row) => [row.to, { from: row.from, partial: row.partial }] as const),
	)
}

/**
 * What a point covers, as the annual table prints it: "31 Oct 2026 – 30 Oct 2027", and for a part year
 * "31 Oct – 31 Dec 2053, part year". A figure with no period of its own is the day it is stated for.
 */
export function periodText(point: Pt): string {
	const { period } = point
	if (period === null) return formatDate(point.date)
	const from = formatDate(period.from)
	const to = formatDate(point.date)
	const sameYear = period.from.slice(0, 4) === point.date.slice(0, 4)
	const start = period.partial && sameYear ? from.slice(0, from.length - 5) : from
	return `${start} – ${to}${period.partial ? ", part year" : ""}`
}
