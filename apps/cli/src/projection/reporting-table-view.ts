import { z } from "zod"
import {
	cashflowMonthRow,
	cashflowMonthTotalRow,
	cashflowMonthTransferRow,
	cashflowYearRow,
	cashflowYearTotalRow,
	cashflowYearTransferRow,
} from "./reporting-row-view"
import type {
	CashflowMonthRow,
	CashflowMonthTotalRow,
	CashflowMonthTransferRow,
	CashflowYearRow,
	CashflowYearTotalRow,
	CashflowYearTransferRow,
} from "./reporting-view"

/*
 * The six tables a Reporting year or month breakdown adds (cli ADR-0086): the lines, the nine section
 * totals and the transfers of `--breakdown-years` and `--breakdown-months`. Each table's name, count
 * and rows are the `cashflow`, `cashflowTotals` and `transfers` shapes of ADR-0058 and ADR-0070 over
 * another span.
 */

/** One table of a span kind: its name, its row count and its rows. */
export type ReportingTable<Name extends string, Row> = { name: Name; count: number; rows: Row[] }

export type CashflowYearsTable = ReportingTable<"cashflowYears", CashflowYearRow>
export type CashflowYearTotalsTable = ReportingTable<"cashflowYearTotals", CashflowYearTotalRow>
export type CashflowYearTransfersTable = ReportingTable<
	"cashflowYearTransfers",
	CashflowYearTransferRow
>
export type CashflowMonthsTable = ReportingTable<"cashflowMonths", CashflowMonthRow>
export type CashflowMonthTotalsTable = ReportingTable<"cashflowMonthTotals", CashflowMonthTotalRow>
export type CashflowMonthTransfersTable = ReportingTable<
	"cashflowMonthTransfers",
	CashflowMonthTransferRow
>

/** One Reporting table: its name in the `tables` list, and the rows the engine's lines make. */
function tableOf<Name extends string, Row>(
	name: Name,
	what: string,
	row: z.ZodType<Row>,
): z.ZodType<ReportingTable<Name, Row>> {
	return z.strictObject({
		name: z.literal(name).describe(what),
		count: z.number().int().describe("The number of rows."),
		rows: z.array(row).describe(what),
	})
}

const YEAR = "present only with --breakdown-years"
const MONTHS = "present only with --breakdown-months"

export const cashflowYearsTable: z.ZodType<CashflowYearsTable> = tableOf(
	"cashflowYears",
	`One row per Reporting year and line, in the engine's group order, ${YEAR}.`,
	cashflowYearRow,
)

export const cashflowYearTotalsTable: z.ZodType<CashflowYearTotalsTable> = tableOf(
	"cashflowYearTotals",
	`Nine rows per Reporting year, one per section in the order money in, tax, withdrawals, drawn, spending, saving, not funded, left over and unmet, ${YEAR}; zero is stated.`,
	cashflowYearTotalRow,
)

export const cashflowYearTransfersTable: z.ZodType<CashflowYearTransfersTable> = tableOf(
	"cashflowYearTransfers",
	`What each transfer Flow moved between the plan's own Accounts in each Reporting year, ${YEAR} and a Scenario that declares a transfer Flow.`,
	cashflowYearTransferRow,
)

export const cashflowMonthsTable: z.ZodType<CashflowMonthsTable> = tableOf(
	"cashflowMonths",
	`One row per Reporting month and line, in the engine's group order, ${MONTHS}.`,
	cashflowMonthRow,
)

export const cashflowMonthTotalsTable: z.ZodType<CashflowMonthTotalsTable> = tableOf(
	"cashflowMonthTotals",
	`Nine rows per Reporting month, one per section, ${MONTHS}; a month with no line states nine zeros.`,
	cashflowMonthTotalRow,
)

export const cashflowMonthTransfersTable: z.ZodType<CashflowMonthTransfersTable> = tableOf(
	"cashflowMonthTransfers",
	`What each transfer Flow moved between the plan's own Accounts in each Reporting month, ${MONTHS} and a Scenario that declares a transfer Flow.`,
	cashflowMonthTransferRow,
)
