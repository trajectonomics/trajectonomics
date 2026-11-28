import type { CashflowTotal } from "./cashflow-totals-view"
import type { CashflowGroup } from "./cashflow-view"

/*
 * The fields a Reporting year or Reporting month row states (cli ADR-0086): the span, then the line,
 * total or transfer fields of the `cashflow`, `cashflowTotals` and `transfers` tables of ADR-0058 and
 * ADR-0070. One object of each kind is shared by the six tables, so a year and a month never name a
 * field differently.
 */

/** The span every Reporting row states: its year, the days it covers and whether they are cut. */
export type ReportingPoint = { year: number; from: string; to: string; partial: boolean }

/** The line fields a Reporting row states, as a `cashflow` row does. */
export type ReportingLine = {
	group: CashflowGroup
	id: string | null
	account: string | null
	category: string | null
	amount: string
	entry?: number | undefined
}

/** The fields a Reporting totals row states. */
export type ReportingTotal = { total: CashflowTotal; amount: string }

/** The fields a Reporting transfer row states, as a `transfers` row does. */
export type ReportingTransfer = {
	flow: string
	source: string
	target: string
	amount: string
	unmoved: string
}

export type CashflowYearRow = ReportingPoint & ReportingLine
export type CashflowMonthRow = ReportingPoint & ReportingLine & { month: string }
export type CashflowYearTotalRow = ReportingPoint & ReportingTotal
export type CashflowMonthTotalRow = ReportingPoint & ReportingTotal & { month: string }
export type CashflowYearTransferRow = ReportingPoint & ReportingTransfer
export type CashflowMonthTransferRow = ReportingPoint & ReportingTransfer & { month: string }
