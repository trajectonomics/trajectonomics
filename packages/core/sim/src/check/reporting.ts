import { reportingYearOf } from "../calendar/reporting"
import type { ReportingYearRange } from "../types/reporting"
import type { Emit, Problem } from "./codes"
import { isValidDate } from "./date"
import { makeGuard } from "./guard"
import { isRecord } from "./shape"

const PATH: readonly string[] = ["options", "reporting"]
const KEYS = new Set(["yearStart", "years", "monthsOf"])

function isYearStart(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12
}

/** The Reporting years the Timeline's dates fall in, or `undefined` when an input cannot be read (ADR 0034). */
export function reportingYearRange(
	timeline: unknown,
	yearStart: unknown,
): ReportingYearRange | undefined {
	if (!isYearStart(yearStart) || !isRecord(timeline)) return undefined
	const start = timeline["start"]
	const horizon = timeline["horizon"]
	if (!isValidDate(start) || !isValidDate(horizon) || horizon < start) return undefined
	return { first: reportingYearOf(start, yearStart), last: reportingYearOf(horizon, yearStart) }
}

function checkMonthsOf(value: unknown, timeline: unknown, yearStart: unknown, emit: Emit): void {
	if (value === undefined || value === "first" || value === "all") return
	const at = [...PATH, "monthsOf"]
	if (typeof value !== "number" || !Number.isInteger(value)) {
		emit("INVALID_OPTION", at)
		return
	}
	const range = reportingYearRange(timeline, yearStart)
	if (range !== undefined && (value < range.first || value > range.last)) emit("INVALID_OPTION", at)
}

function checkReporting(
	reporting: Readonly<Record<string, unknown>>,
	timeline: unknown,
	emit: Emit,
): void {
	const yearStart = reporting["yearStart"]
	const years = reporting["years"]
	if (!isYearStart(yearStart)) emit("INVALID_OPTION", [...PATH, "yearStart"])
	if (years !== undefined && typeof years !== "boolean") emit("INVALID_OPTION", [...PATH, "years"])
	checkMonthsOf(reporting["monthsOf"], timeline, yearStart, emit)
	for (const key of Object.keys(reporting)) {
		if (!KEYS.has(key)) emit("INVALID_OPTION", [...PATH, key])
	}
}

/**
 * Validates `ProjectionOptions.reporting` separately from the three projection inputs, so one call
 * reports every problem at once. Absent asks for nothing and is valid (ADR 0034).
 */
export function checkReportingOptions(reporting: unknown, timeline: unknown): readonly Problem[] {
	if (reporting === undefined) return []
	const problems: Problem[] = []
	const emit: Emit = (code, path) => void problems.push({ code, path })
	const guard = makeGuard(emit)
	guard("options", undefined, () => {
		if (isRecord(reporting)) checkReporting(reporting, timeline, emit)
		else emit("INVALID_OPTION", PATH)
	})
	return problems
}
