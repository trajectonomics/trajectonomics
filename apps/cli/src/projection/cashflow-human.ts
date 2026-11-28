import { type AppError, isAppError } from "../errors"
import type { ColumnHint } from "../table/lines"
import { isRecord, tableLines } from "../table/lines"
import {
	type BlockRow,
	figuresOf,
	incomeRows,
	lineOf,
	outsideCash,
	textOf,
	transferRows,
} from "./cashflow-human-rows"
import { type CashflowTotals, cashflowTotalsOf } from "./cashflow-totals"
import { moneyOf } from "./money"

/*
 * `projection run --breakdown`'s human view (cli ADR-0058). The long tables are for JSON; a person
 * reads one short block per Annual roll-up after the body. Every total the block prints comes from
 * `cashflowTotalsOf`, the same function the JSON table is built with, so the block and the JSON cannot
 * disagree (cli ADR-0058, addendum).
 */

export const BLOCK_COLUMNS: readonly ColumnHint[] = [
	{ key: "line", label: "line" },
	{ key: "amount", label: "amount", align: "right" },
]

/** A named table's rows of the result, or nothing when the result has no such table. */
export function tableRows(
	data: Record<string, unknown>,
	name: string,
): Record<string, unknown>[] | undefined {
	const tables = data["tables"]
	if (!Array.isArray(tables)) return undefined
	const table = tables.find((entry) => isRecord(entry) && entry["name"] === name)
	if (!isRecord(table) || !Array.isArray(table["rows"])) return undefined
	return table["rows"].filter(isRecord)
}

/** One roll-up's block rows: each section's total, then the lines a person reads under it. */
function blockRows(
	annual: Record<string, unknown>,
	lines: readonly Record<string, unknown>[],
	transfers: readonly Record<string, unknown>[],
	currency: string,
): BlockRow[] {
	const money = moneyOf(currency)
	const figures = figuresOf(annual)
	const groupLines = (group: string) => lines.filter((line) => line["group"] === group)
	const totals: CashflowTotals | AppError = cashflowTotalsOf(
		figures,
		lines.map(lineOf),
		currency,
		String(annual["to"]),
	)
	// The JSON table was built from the same function first, so a refusal never reaches the block.
	if (isAppError(totals))
		throw new Error("a cash-flow total the result states is past the safe integers")

	const rows: BlockRow[] = [
		{ line: "money in", amount: money(totals["money in"]) },
		...incomeRows(annual, lines, currency),
	]
	if (groupLines("withdrawal").length > 0) {
		rows.push({ line: "  withdrawals", amount: money(totals.withdrawals) })
	}
	if (groupLines("drawn").length > 0) rows.push({ line: "  drawn", amount: money(totals.drawn) })
	if (groupLines("prepaid").length + groupLines("settlement").length > 0) {
		rows.push({ line: "tax", amount: money(totals.tax) })
	}
	rows.push({ line: "spending", amount: money(totals.spending) })
	for (const line of groupLines("category")) {
		const name = line["id"] === null ? "(uncategorised)" : String(line["id"])
		rows.push({ line: `  ${name}`, amount: textOf(line["amount"], "amount") })
	}
	rows.push({ line: "saving", amount: money(totals.saving) })
	// Not indented under saving: it is what the cash could not fund, not a part of saving.
	if (totals["not funded"] !== 0)
		rows.push({ line: "not funded", amount: money(totals["not funded"]) })
	rows.push({ line: "left over", amount: money(totals["left over"]) })
	if (totals.unmet !== 0) rows.push({ line: "unmet", amount: money(totals.unmet) })
	rows.push(...transferRows(annual, transfers), ...outsideCash(annual))
	return rows
}

/**
 * One block per Annual roll-up, printed after the body, when the result carries a cash-flow table.
 * Without `--breakdown` the result has none, and this prints nothing.
 */
export function cashflowBlocks(data: Record<string, unknown>): string[] {
	const lines = tableRows(data, "cashflow")
	const annual = tableRows(data, "annual")
	if (lines === undefined || annual === undefined) return []
	const transfers = tableRows(data, "transfers") ?? []
	const currency = String(data["currency"])
	return annual.map((row) => {
		const rollupLines = lines.filter((line) => line["index"] === row["index"])
		const rollupTransfers = transfers.filter((line) => line["index"] === row["index"])
		const rows = blockRows(row, rollupLines, rollupTransfers, currency)
		const heading = `cash flow ${String(row["from"])} to ${String(row["to"])}`
		return tableLines(heading, rows.length, rows, BLOCK_COLUMNS)
	})
}
