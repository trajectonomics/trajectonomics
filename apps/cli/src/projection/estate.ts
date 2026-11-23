import type {
	AnnualRollup,
	EstateLine,
	EstateStatement,
	ProjectionRow,
} from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { fail, isAppError } from "../errors"
import { endRowsOf } from "./ends"
import type { EstateLineRow, EstateLinesTable, EstateRow, EstateTable } from "./estate-view"
import { moneyOf } from "./money"

/*
 * `projection run --estate`'s rows (cli ADR-0064): the engine's Estate statements in the CLI's money.
 * Each figure is the engine's. The two totals are the exact integer sums of the engine's own lines,
 * the one place the table adds, as the cash-flow section totals do (cli ADR-0058).
 */

/** The exact sum, in minor units, of an engine's lines. */
function totalOf(lines: readonly EstateLine[]): number {
	return lines.reduce((sum, line) => sum + line.amount, 0)
}

/** One statement as the estate table states it. */
export function estateRowOf(statement: EstateStatement, currency: string): EstateRow {
	const money = moneyOf(currency)
	return {
		date: statement.date,
		gross: money(statement.gross),
		debts: money(statement.debts),
		costs: money(totalOf(statement.costs)),
		net: money(statement.net),
		gifts: money(totalOf(statement.gifts)),
		toHeirs: money(statement.toHeirs),
		realNet: money(statement.real.net),
		realToHeirs: money(statement.real.toHeirs),
	}
}

/** One statement's costs, then its gifts, in the order the estate block states them. */
export function estateLineRowsOf(statement: EstateStatement, currency: string): EstateLineRow[] {
	const money = moneyOf(currency)
	const line = (kind: "cost" | "gift", entry: EstateLine): EstateLineRow => ({
		date: statement.date,
		line: entry.id,
		kind,
		amount: money(entry.amount),
	})
	return [
		...statement.costs.map((entry) => line("cost", entry)),
		...statement.gifts.map((entry) => line("gift", entry)),
	]
}

/**
 * The statements the tables state: the one on each roll-up's end row (the row `realNetWorth` reads),
 * or every statement with `monthly`. The engine states one per row, in row order.
 */
function statementsOf(
	statements: readonly EstateStatement[],
	rollups: readonly AnnualRollup[],
	rows: readonly ProjectionRow[],
	monthly: boolean,
): EstateStatement[] | AppError {
	if (monthly) return [...statements]
	const ends = endRowsOf(rollups, rows)
	if (isAppError(ends)) return ends
	const byDate = new Map(statements.map((statement) => [statement.date, statement]))
	const found: EstateStatement[] = []
	for (const end of ends) {
		const statement = byDate.get(end.date)
		if (statement === undefined) {
			return fail("internal", {
				message: `The engine states no estate for the row of ${end.date}.`,
			})
		}
		found.push(statement)
	}
	return found
}

/** The two tables `--estate` adds: the estate by date, then each cost and gift on those dates. */
export function estateTablesOf(
	statements: readonly EstateStatement[] | undefined,
	rollups: readonly AnnualRollup[],
	rows: readonly ProjectionRow[],
	monthly: boolean,
	currency: string,
): [EstateTable, EstateLinesTable] | AppError {
	if (statements === undefined) {
		return fail("internal", { message: "The engine returned no estate statements for --estate." })
	}
	const chosen = statementsOf(statements, rollups, rows, monthly)
	if (isAppError(chosen)) return chosen
	const estate = chosen.map((statement) => estateRowOf(statement, currency))
	const lines = chosen.flatMap((statement) => estateLineRowsOf(statement, currency))
	return [
		{ name: "estate", count: estate.length, rows: estate },
		{ name: "estateLines", count: lines.length, rows: lines },
	]
}
