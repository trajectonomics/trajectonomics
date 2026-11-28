import type { ReportingCashflow } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { CASHFLOW_TOTALS } from "./cashflow-totals-view"
import { moneyOf } from "./money"
import { figuresOfSpan, linesOfSpan } from "./reporting-span-lines"
import type {
	CashflowYearRow,
	CashflowYearTotalRow,
	CashflowYearTransferRow,
} from "./reporting-view"
import { spanTotalsOf } from "./span-totals"

/*
 * The rows of the three year tables of `--breakdown-years` (cli ADR-0086): one row per Reporting year
 * and line, nine total rows per year, and one row per transfer the engine states. Every line is the
 * engine's and every total is the exact sum of that year's lines.
 */

export function yearRowsOf(
	years: readonly ReportingCashflow[],
	currency: string,
): CashflowYearRow[] {
	return years.flatMap((span) =>
		linesOfSpan(span, currency).map((line) => ({
			year: span.year,
			from: span.from,
			to: span.to,
			partial: span.partial,
			...line,
		})),
	)
}

export function yearTotalRowsOf(
	years: readonly ReportingCashflow[],
	currency: string,
): CashflowYearTotalRow[] | AppError {
	const money = moneyOf(currency)
	const rows: CashflowYearTotalRow[] = []
	for (const span of years) {
		const totals = spanTotalsOf(figuresOfSpan(span, currency), currency, span.to)
		if (isAppError(totals)) return totals
		for (const total of CASHFLOW_TOTALS) {
			rows.push({
				year: span.year,
				from: span.from,
				to: span.to,
				partial: span.partial,
				total,
				amount: money(totals[total]),
			})
		}
	}
	return rows
}

export function yearTransferRowsOf(
	years: readonly ReportingCashflow[],
	currency: string,
): CashflowYearTransferRow[] {
	const money = moneyOf(currency)
	return years.flatMap((span) =>
		(span.transfers ?? []).map((line) => ({
			year: span.year,
			from: span.from,
			to: span.to,
			partial: span.partial,
			flow: line.flow,
			source: line.source,
			target: line.target,
			amount: money(line.amount),
			unmoved: money(line.unmoved),
		})),
	)
}
