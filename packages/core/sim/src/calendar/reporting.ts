import type { DateString } from "../types"
import type { ReportingSpan } from "../types/reporting"
import { addDays } from "./arith"
import { formatDate, parseDate } from "./civil"
import { statementMonths } from "./statement-months"

/** The Reporting year that holds `date`: the calendar year whose `yearStart` month began it. */
export function reportingYearOf(date: DateString, yearStart: number): number {
	const { year, month } = parseDate(date)
	return month >= yearStart ? year : year - 1
}

function nominalFirst(year: number, yearStart: number): DateString {
	return formatDate({ year, month: yearStart, day: 1 })
}

/** The day before the next year's nominal first day, so a March year ends on 28 or 29 February. */
function nominalLast(year: number, yearStart: number): DateString {
	return addDays(nominalFirst(year + 1, yearStart), -1)
}

/** The Reporting years of `[start, end]`, cut at both ends, each named by the year it begins in (ADR 0034). */
export function reportingYears(
	start: DateString,
	end: DateString,
	runsOut: DateString | undefined,
	yearStart: number,
): readonly ReportingSpan[] {
	const first = reportingYearOf(start, yearStart)
	const last = reportingYearOf(end, yearStart)
	const spans: ReportingSpan[] = []
	for (let year = first; year <= last; year++) {
		const from = year === first ? start : nominalFirst(year, yearStart)
		const to = year === last ? end : nominalLast(year, yearStart)
		const partial =
			from !== nominalFirst(year, yearStart) ||
			to !== nominalLast(year, yearStart) ||
			to === runsOut
		spans.push({ year, from, to, partial })
	}
	return spans
}

/** The Reporting months of `[start, end]`, cut at both ends, each with its Reporting year (ADR 0034). */
export function reportingMonths(
	start: DateString,
	end: DateString,
	runsOut: DateString | undefined,
	yearStart: number,
): readonly ReportingSpan[] {
	return statementMonths(start, end, runsOut).map((month) => ({
		year: reportingYearOf(month.from, yearStart),
		from: month.from,
		to: month.to,
		partial: month.partial,
	}))
}
