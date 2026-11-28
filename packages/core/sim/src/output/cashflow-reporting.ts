import { reportingMonths, reportingYearOf, reportingYears } from "../calendar/reporting"
import { overflow } from "../engine/overflow"
import type { EngineRun } from "../engine/result"
import type { DateString, Scenario } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { ReportingCashflow, ReportingOptions, ReportingSpan } from "../types/reporting"
import { type CategoryTotal, categoryTotals } from "./cashflow-flows"
import { linesOf } from "./cashflow-lines"
import { overflows } from "./cashflow-overflow"
import type { PeriodSums } from "./cashflow-sums"
import { sumSpans } from "./span-sums"

export interface ReportingOutcome {
	/** The `cashflowYears` and `cashflowMonths` keys of the Projection; each absent unless asked. */
	readonly fields: {
		readonly cashflowYears?: readonly ReportingCashflow[]
		readonly cashflowMonths?: readonly ReportingCashflow[]
	}
	readonly problem: ProjectionProblem | undefined
}

const NOTHING: ReportingOutcome = { fields: {}, problem: undefined }

/** The options when they ask for a Reporting breakdown, else `undefined`: `{ yearStart }` asks for nothing. */
export function reportingAsked(
	reporting: ReportingOptions | undefined,
): ReportingOptions | undefined {
	if (reporting === undefined) return undefined
	return reporting.years === true || reporting.monthsOf !== undefined ? reporting : undefined
}

/** The Reporting months `monthsOf` names, each with its Reporting year. */
function monthsOf(
	start: DateString,
	end: DateString,
	runsOut: DateString | undefined,
	reporting: ReportingOptions,
): readonly ReportingSpan[] {
	const selection = reporting.monthsOf
	if (selection === undefined) return []
	const all = reportingMonths(start, end, runsOut, reporting.yearStart)
	if (selection === "all") return all
	const year = selection === "first" ? reportingYearOf(start, reporting.yearStart) : selection
	return all.filter((span) => span.year === year)
}

interface Stated {
	readonly span: ReportingSpan
	readonly sums: PeriodSums
	readonly categories: readonly CategoryTotal[]
	readonly unmet: bigint
}

/** Each span's sums, categories and run-out Shortfall. */
function statedOf(
	run: EngineRun,
	scenario: Scenario,
	spans: readonly ReportingSpan[],
): readonly Stated[] {
	const runsOut = run.runsOut?.date
	const sums = sumSpans(run.totals, spans)
	return spans.map((span, index) => {
		const spanSums = sums[index]!
		return {
			span,
			sums: spanSums,
			categories: categoryTotals(scenario.flows, spanSums.planned),
			unmet: span.to === runsOut ? (run.runsOut?.unmet ?? 0n) : 0n,
		}
	})
}

/** The Reporting year and month breakdowns the options ask for, or `{}` when they ask for none. */
export function buildReportingCashflow(
	run: EngineRun,
	scenario: Scenario,
	start: DateString,
	end: DateString,
	reporting: ReportingOptions | undefined,
): ReportingOutcome {
	const asked = reportingAsked(reporting)
	if (asked === undefined) return NOTHING
	const runsOut = run.runsOut?.date
	const years: readonly ReportingSpan[] =
		asked.years === true ? reportingYears(start, end, runsOut, asked.yearStart) : []
	const statedYears = statedOf(run, scenario, years)
	const statedMonths = statedOf(run, scenario, monthsOf(start, end, runsOut, asked))
	for (const item of [...statedYears, ...statedMonths]) {
		if (overflows(item.sums, item.categories, item.unmet)) {
			return { fields: {}, problem: overflow(item.span.to) }
		}
	}
	const line = (item: Stated): ReportingCashflow => ({
		year: item.span.year,
		from: item.span.from,
		to: item.span.to,
		partial: item.span.partial,
		...linesOf(scenario, item.sums, item.categories, item.unmet),
	})
	return {
		fields: {
			...(asked.years === true ? { cashflowYears: statedYears.map(line) } : {}),
			...(asked.monthsOf === undefined ? {} : { cashflowMonths: statedMonths.map(line) }),
		},
		problem: undefined,
	}
}
