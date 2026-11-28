import { reportingMonths, reportingYearOf } from "../calendar/reporting"
import type { EngineRun } from "../engine/result"
import type { DateString, Scenario } from "../types"
import type { ReportingOptions, ReportingSpan } from "../types/reporting"
import { type CategoryTotal, categoryTotals } from "./cashflow-flows"
import type { PeriodSums } from "./cashflow-sums"
import { sumSpans } from "./span-sums"

/** One Reporting span with its sums, categories and run-out Shortfall. */
export interface Stated {
	readonly span: ReportingSpan
	readonly sums: PeriodSums
	readonly categories: readonly CategoryTotal[]
	readonly unmet: bigint
}

/** The Reporting months `monthsOf` names, each with its Reporting year. */
export function monthsOf(
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

/** Each span's sums, categories and run-out Shortfall. */
export function statedOf(
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
