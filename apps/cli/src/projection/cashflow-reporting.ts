import type { Projection, ReportingCashflow, ReportingOptions } from "@trajectonomics/core/sim"
import { type AppError, fail, isAppError } from "../errors"
import { monthRowsOf, monthTotalRowsOf, monthTransferRowsOf } from "./cashflow-month-rows"
import { yearRowsOf, yearTotalRowsOf, yearTransferRowsOf } from "./cashflow-year-rows"
import type { ProjectionTable } from "./run-view"

/*
 * The six tables a Reporting year or month breakdown adds to `tables` (cli ADR-0086), right after the
 * `--breakdown` ones. The engine decides every line and every total; an engine that omits a key it was
 * asked for is an internal failure, as `cashflowTablesOf` treats `cashflow`.
 */

/** The year tables: the lines, the nine totals, and the transfers when a transfer Flow moved something. */
function yearTablesOf(
	years: readonly ReportingCashflow[],
	currency: string,
): ProjectionTable[] | AppError {
	const totals = yearTotalRowsOf(years, currency)
	if (isAppError(totals)) return totals
	const rows = yearRowsOf(years, currency)
	const transfers = yearTransferRowsOf(years, currency)
	const tables: ProjectionTable[] = [
		{ name: "cashflowYears", count: rows.length, rows },
		{ name: "cashflowYearTotals", count: totals.length, rows: totals },
	]
	if (transfers.length > 0) {
		tables.push({ name: "cashflowYearTransfers", count: transfers.length, rows: transfers })
	}
	return tables
}

/** The month tables, named as the year ones are, over the Reporting months asked for. */
function monthTablesOf(
	months: readonly ReportingCashflow[],
	currency: string,
): ProjectionTable[] | AppError {
	const totals = monthTotalRowsOf(months, currency)
	if (isAppError(totals)) return totals
	const rows = monthRowsOf(months, currency)
	const transfers = monthTransferRowsOf(months, currency)
	const tables: ProjectionTable[] = [
		{ name: "cashflowMonths", count: rows.length, rows },
		{ name: "cashflowMonthTotals", count: totals.length, rows: totals },
	]
	if (transfers.length > 0) {
		tables.push({ name: "cashflowMonthTransfers", count: transfers.length, rows: transfers })
	}
	return tables
}

/**
 * The tables the two Reporting flags ask for, or the internal failure for a key the engine left out.
 * Present only when `reporting` is defined, which `reportingOptionsOf` makes true only for a flag.
 */
export function reportingTablesOf(
	projection: Projection,
	reporting: ReportingOptions,
	currency: string,
): ProjectionTable[] | AppError {
	const tables: ProjectionTable[] = []
	if (reporting.years === true) {
		const years = projection.cashflowYears
		if (years === undefined) {
			return fail("internal", {
				message: "The engine returned no cash flow years for --breakdown-years.",
			})
		}
		const built = yearTablesOf(years, currency)
		if (isAppError(built)) return built
		tables.push(...built)
	}
	if (reporting.monthsOf !== undefined) {
		const months = projection.cashflowMonths
		if (months === undefined) {
			return fail("internal", {
				message: "The engine returned no cash flow months for --breakdown-months.",
			})
		}
		const built = monthTablesOf(months, currency)
		if (isAppError(built)) return built
		tables.push(...built)
	}
	return tables
}
