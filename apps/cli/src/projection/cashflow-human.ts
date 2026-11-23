import type { ColumnHint } from "../table/lines"
import { isRecord, tableLines } from "../table/lines"
import { type CashflowTotals, cashflowTotalsOf, type RollupFigures } from "./cashflow-totals"
import { moneyOf } from "./money"

/*
 * `projection run --breakdown`'s human view (cli ADR-0058). The long tables are for JSON; a person
 * reads one short block per Annual roll-up after the body. Every total the block prints comes from
 * `cashflowTotalsOf`, the same function the JSON table is built with, so the block and the JSON cannot
 * disagree (cli ADR-0058, addendum).
 */

const BLOCK_COLUMNS: readonly ColumnHint[] = [
	{ key: "line", label: "line" },
	{ key: "amount", label: "amount", align: "right" },
]

/** One printed row of a block: a section total, or a line under it. */
type BlockRow = { line: string; amount: string }

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

/** The cash-flow tables a person does not read: the long lines and the totals are JSON's; the blocks print instead. */
const HIDDEN_TABLES = ["cashflow", "cashflowTotals"]

/** The result without its cash-flow tables: the long tables are for JSON, and the blocks print instead. */
export function cashflowHidden(data: Record<string, unknown>): Record<string, unknown> {
	const tables = data["tables"]
	if (!Array.isArray(tables)) return data
	return {
		...data,
		tables: tables.filter(
			(entry) => !(isRecord(entry) && HIDDEN_TABLES.includes(String(entry["name"]))),
		),
	}
}

/** A field of a table row as the text the engine stated it; anything else is a broken result. */
function textOf(value: unknown, field: string): string {
	if (typeof value !== "string")
		throw new Error(`a cash-flow ${field} is not text: ${String(value)}`)
	return value
}

/** One Annual roll-up's figures, as the totals read them. */
function figuresOf(row: Record<string, unknown>): RollupFigures {
	return {
		income: textOf(row["income"], "income"),
		expense: textOf(row["expense"], "expense"),
		contributions: textOf(row["contributions"], "contributions"),
		unfundedContributions: textOf(row["unfundedContributions"], "unfundedContributions"),
		unmet: textOf(row["unmet"], "unmet"),
	}
}

/** One roll-up's block rows: each section's total, then the lines a person reads under it. */
function blockRows(
	annual: Record<string, unknown>,
	lines: readonly Record<string, unknown>[],
	currency: string,
): BlockRow[] {
	const money = moneyOf(currency)
	const figures = figuresOf(annual)
	const groupLines = (group: string) => lines.filter((line) => line["group"] === group)
	const totals: CashflowTotals = cashflowTotalsOf(
		figures,
		lines.map((line) => ({
			group: textOf(line["group"], "group"),
			amount: textOf(line["amount"], "amount"),
		})),
		currency,
	)

	const rows: BlockRow[] = [
		{ line: "money in", amount: money(totals["money in"]) },
		{ line: "  income", amount: figures.income },
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
	const currency = String(data["currency"])
	return annual.map((row) => {
		const rollupLines = lines.filter((line) => line["index"] === row["index"])
		const rows = blockRows(row, rollupLines, currency)
		const heading = `cash flow ${String(row["from"])} to ${String(row["to"])}`
		return tableLines(heading, rows.length, rows, BLOCK_COLUMNS)
	})
}
