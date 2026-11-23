import type { LiabilityStatement, ProjectionOptions } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { fail } from "../errors"
import type { LiabilityRow, PaidOffRow } from "./liabilities-view"
import { moneyOf } from "./money"
import type { ProjectionTable } from "./run-view"

/*
 * `projection run --liabilities`' rows (cli ADR-0059): the engine's statements in the CLI's money.
 * Each figure is the engine's own, formatted at the Currency's scale; none is recomputed here.
 */

/** The engine's options for one run: each optional output is asked for only by its own flag (cli ADR-0058, ADR-0059). */
export function optionsOf(
	breakdown: boolean,
	liabilities: boolean,
	spending: boolean,
): ProjectionOptions {
	return {
		...(breakdown ? { cashflowBreakdown: true } : {}),
		...(liabilities ? { liabilityStatements: true } : {}),
		...(spending ? { spendingRules: true } : {}),
	}
}

/** One row per liability and month, in Scenario order then date order (sim ADR-0017). */
export function liabilityRowsOf(
	statements: readonly LiabilityStatement[],
	currency: string,
): LiabilityRow[] {
	const money = moneyOf(currency)
	return statements.flatMap((statement) =>
		statement.months.map((month) => ({
			account: statement.account,
			from: month.from,
			to: month.to,
			opening: money(month.opening),
			drawn: money(month.drawn),
			paid: money(month.paid),
			interest: money(month.interest),
			closing: money(month.closing),
			partial: month.partial,
		})),
	)
}

/** One row per liability: the date it was paid off, or null when it was not by the end. */
export function paidOffRowsOf(statements: readonly LiabilityStatement[]): PaidOffRow[] {
	return statements.map((statement) => ({
		account: statement.account,
		date: statement.paidOff ?? null,
	}))
}

/** The two tables `--liabilities` adds: the months, then the paid-off dates (cli ADR-0059). */
export function liabilityTablesOf(
	statements: readonly LiabilityStatement[] | undefined,
	currency: string,
): ProjectionTable[] | AppError {
	if (statements === undefined) {
		return fail("internal", {
			message: "The engine returned no liability statements for --liabilities.",
		})
	}
	const months = liabilityRowsOf(statements, currency)
	const paid = paidOffRowsOf(statements)
	return [
		{ name: "liabilities", count: months.length, rows: months },
		{ name: "paidOff", count: paid.length, rows: paid },
	]
}
