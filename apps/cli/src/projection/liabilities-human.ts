import { type ColumnHint, tableLines } from "../table/lines"
import { tableRows } from "./cashflow-human"

/*
 * `projection run --liabilities`' human view (cli ADR-0059). A person reads one line per loan, which
 * says whether it is paid off and when, or what it still owes at the end, and then the month table.
 * Both are read from the statement rows, so the text states no figure the engine did not give.
 */

const MONTH_COLUMNS: readonly ColumnHint[] = [
	{ key: "account", label: "account" },
	{ key: "from", label: "from" },
	{ key: "to", label: "to" },
	{ key: "opening", label: "opening", align: "right" },
	{ key: "drawn", label: "drawn", align: "right" },
	{ key: "paid", label: "paid", align: "right" },
	{ key: "interest", label: "interest", align: "right" },
	{ key: "closing", label: "closing", align: "right" },
	{ key: "partial", label: "partial" },
]

/** The result without its liability tables: the human form prints them as blocks instead. */
export function liabilitiesHidden(data: Record<string, unknown>): Record<string, unknown> {
	const tables = data["tables"]
	if (!Array.isArray(tables)) return data
	const hidden = new Set(["liabilities", "paidOff"])
	return {
		...data,
		tables: tables.filter(
			(entry) =>
				!(typeof entry === "object" && entry !== null && hidden.has(String(entry["name"]))),
		),
	}
}

/** The last month of one liability, which states what it owed at the end of the Projection. */
function lastMonthOf(
	months: readonly Record<string, unknown>[],
	account: unknown,
): Record<string, unknown> | undefined {
	return months.filter((month) => month["account"] === account).at(-1)
}

/**
 * One line per loan, then the month table, printed after the body when the result carries the
 * liability tables. Without `--liabilities` the result has none, and this prints nothing.
 */
export function liabilityBlocks(data: Record<string, unknown>): string[] {
	const paid = tableRows(data, "paidOff")
	const months = tableRows(data, "liabilities")
	if (paid === undefined || months === undefined || paid.length === 0) return []
	const lines = paid.map((row) => {
		if (row["date"] !== null) return `${String(row["account"])}: paid off on ${String(row["date"])}`
		const last = lastMonthOf(months, row["account"])
		if (last === undefined) return `${String(row["account"])}: not paid off by the end`
		return `${String(row["account"])}: owes ${String(last["closing"])} at ${String(last["to"])}`
	})
	return [lines.join("\n"), tableLines("liabilities", months.length, months, MONTH_COLUMNS)]
}
