import type { ReportingCashflow } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { CASHFLOW_TOTALS } from "./cashflow-totals-view"
import { moneyOf } from "./money"
import { figuresOfSpan, linesOfSpan, monthOfSpan } from "./reporting-span-lines"
import type {
	CashflowMonthRow,
	CashflowMonthTotalRow,
	CashflowMonthTransferRow,
} from "./reporting-view"
import { spanTotalsOf } from "./span-totals"

/*
 * The rows of the three month tables of `--breakdown-months` (cli ADR-0086): one row per Reporting month
 * and line, nine total rows per month, and one row per transfer the engine states. Every month is
 * stated, an empty one included, so a reader can draw a month with nothing in it.
 */

export function monthRowsOf(
	months: readonly ReportingCashflow[],
	currency: string,
): CashflowMonthRow[] {
	return months.flatMap((span) =>
		linesOfSpan(span, currency).map((line) => ({
			year: span.year,
			month: monthOfSpan(span),
			from: span.from,
			to: span.to,
			partial: span.partial,
			...line,
		})),
	)
}

export function monthTotalRowsOf(
	months: readonly ReportingCashflow[],
	currency: string,
): CashflowMonthTotalRow[] | AppError {
	const money = moneyOf(currency)
	const rows: CashflowMonthTotalRow[] = []
	for (const span of months) {
		const totals = spanTotalsOf(figuresOfSpan(span, currency), currency, span.to)
		if (isAppError(totals)) return totals
		for (const total of CASHFLOW_TOTALS) {
			rows.push({
				year: span.year,
				month: monthOfSpan(span),
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

export function monthTransferRowsOf(
	months: readonly ReportingCashflow[],
	currency: string,
): CashflowMonthTransferRow[] {
	const money = moneyOf(currency)
	return months.flatMap((span) =>
		(span.transfers ?? []).map((line) => ({
			year: span.year,
			month: monthOfSpan(span),
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
