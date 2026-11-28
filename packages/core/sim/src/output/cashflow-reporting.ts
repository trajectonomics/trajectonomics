import { reportingYears } from "../calendar/reporting"
import { overflow } from "../engine/overflow"
import type { EngineRun } from "../engine/result"
import type { DateString, Scenario } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { ReportingCashflow, ReportingOptions } from "../types/reporting"
import { linesOf } from "./cashflow-lines"
import { overflows } from "./cashflow-overflow"
import { monthsOf, type Stated, statedOf } from "./reporting-sums"

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
	const years = asked.years === true ? reportingYears(start, end, runsOut, asked.yearStart) : []
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
