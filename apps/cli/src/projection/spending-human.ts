import { type ColumnHint, tableLines } from "../table/lines"
import { tableRows } from "./cashflow-human"

/*
 * `projection run --spending`'s human view (cli ADR-0063): one table per rule Flow, a row per Rule
 * year, read from the statement rows. It states no figure the rows lack; the long table is JSON's.
 */

const COLUMNS: readonly ColumnHint[] = [
	{ key: "date", label: "date" },
	{ key: "portfolio", label: "portfolio", align: "right" },
	{ key: "amount", label: "amount", align: "right" },
	{ key: "realAmount", label: "realAmount", align: "right" },
	{ key: "paid", label: "paid", align: "right" },
	{ key: "realPaid", label: "realPaid", align: "right" },
	// Absent from a row whose portfolio was worth nothing; the column prints when any row states it.
	{ key: "withdrawalRate", label: "withdrawalRate", align: "right", optional: true },
	{ key: "action", label: "action" },
]

/** The result without its spending table: the human form prints a table per rule Flow as a block instead. */
export function spendingHidden(data: Record<string, unknown>): Record<string, unknown> {
	const tables = data["tables"]
	if (!Array.isArray(tables)) return data
	return {
		...data,
		tables: tables.filter(
			(entry) =>
				!(typeof entry === "object" && entry !== null && entry["name"] === "spendingRules"),
		),
	}
}

/**
 * One table per rule Flow, in the order the rows state them, printed after the body when the result
 * carries the spending table. Without `--spending` the result has none, and this prints nothing.
 */
export function spendingBlocks(data: Record<string, unknown>): string[] {
	const rows = tableRows(data, "spendingRules")
	if (rows === undefined) return []
	const flows = [...new Set(rows.map((row) => String(row["flow"])))]
	return flows.map((flow) => {
		const years = rows.filter((row) => row["flow"] === flow)
		return tableLines(`spendingRules ${flow}`, years.length, years, COLUMNS)
	})
}
