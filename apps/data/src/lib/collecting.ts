import type { PeakWindowKey } from "./types"
import { daysBetween } from "./window"

/** The full length of each peaks window in UTC days; a 5-hour window fits in the first day. */
export const PEAK_WINDOW_DAYS: Readonly<Record<PeakWindowKey, number>> = Object.freeze({
	fiveHours: 1,
	sevenDays: 7,
	thirtyDays: 30,
})

/** The inclusive count of UTC days from the first collected day to the day in view. */
export function daysCollected(since: string, asOf: string): number {
	return daysBetween(since, asOf) + 1
}

/** How much of a window the collected span covers. */
export type WindowCoverage = {
	complete: boolean
	seen: number
	of: number
}

/**
 * The coverage of a window that needs `windowDays` collected days. An unknown first day is
 * complete, so a page holding a health body cached before this field behaves as it always did.
 */
export function windowCoverage(
	since: string | undefined,
	asOf: string,
	windowDays: number,
): WindowCoverage {
	if (since === undefined) return { complete: true, seen: windowDays, of: windowDays }
	const seen = Math.min(windowDays, Math.max(0, daysCollected(since, asOf)))
	return { complete: seen >= windowDays, seen, of: windowDays }
}

/** A window still filling: the days seen so far, and any note on how the figure is worked out. */
export type CollectingWindow = {
	seen: number
	of: number
	note: string | null
}

const MONTH_DAYS = PEAK_WINDOW_DAYS.thirtyDays
const WEEK_DAYS = PEAK_WINDOW_DAYS.sevenDays
const DERIVED_MONTH_NOTE = "week × 30/7 after 7 days"

/**
 * The collecting state of one peaks window, or null when it holds its full length. The derived
 * month waits for a full week, because it is the week × 30/7; every other month waits 30 days.
 */
export function peakWindowState(
	key: PeakWindowKey,
	since: string | undefined,
	asOf: string,
	monthFromWeek: boolean,
): CollectingWindow | null {
	if (key === "fiveHours" || since === undefined) return null
	if (key === "sevenDays" || monthFromWeek) {
		const week = windowCoverage(since, asOf, WEEK_DAYS)
		if (week.complete) return null
		return {
			seen: week.seen,
			of: week.of,
			note: key === "thirtyDays" ? DERIVED_MONTH_NOTE : null,
		}
	}
	const month = windowCoverage(since, asOf, MONTH_DAYS)
	return month.complete ? null : { seen: month.seen, of: month.of, note: null }
}

/** Whether a cell shows its figure, or waits for its window to fill. */
export type PeakCellChoice = { kind: "figure" } | ({ kind: "collecting" } & CollectingWindow)

/**
 * A peaks cell's choice: a window still filling holds its figure back, and a cell with no figure
 * keeps the dash it already has. A five-hour cell always shows its figure.
 */
export function peakCellChoice(
	key: PeakWindowKey,
	hasFigure: boolean,
	since: string | undefined,
	asOf: string,
	monthFromWeek: boolean,
): PeakCellChoice {
	if (!hasFigure) return { kind: "figure" }
	const waiting = peakWindowState(key, since, asOf, monthFromWeek)
	return waiting === null ? { kind: "figure" } : { kind: "collecting", ...waiting }
}

/**
 * A window's days from the first collected day onward, so the chart plots no day before collection
 * and does not lead with a run of zeros.
 */
export function daysFromCollection(
	since: string | null | undefined,
	days: readonly string[],
): readonly string[] {
	if (since === undefined || since === null) return days
	return days.filter((day) => day >= since)
}

const MONTHS = Object.freeze([
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
])

/** A UTC day as the site writes it in prose: `27 Nov`, or the input when it is not a day. */
export function shortDay(day: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
	if (match === null) return day
	const month = MONTHS[Number(match[2]) - 1]
	if (month === undefined) return day
	return `${Number(match[3])} ${month}`
}

/** The freshness line's collecting note: `Collecting since 27 Nov · day 3`. */
export function collectingLabel(since: string | null | undefined, asOf: string): string | null {
	if (since === undefined || since === null) return null
	const days = daysCollected(since, asOf)
	if (days < 1) return null
	return `Collecting since ${shortDay(since)} · day ${days}`
}
