import { type ColumnHint, isRecord, tableLines } from "../table/lines"
import { endDatesOf } from "./balances-human"
import { tableRows } from "./cashflow-human"

/*
 * `projection run --estate`'s human view (cli ADR-0064): one table of the estate by year, a row per
 * roll-up's end, read from the estate rows. It states no figure the rows lack; the lines table is
 * JSON's.
 */

const COLUMNS: readonly ColumnHint[] = [
	{ key: "date", label: "date" },
	{ key: "gross", label: "gross", align: "right" },
	{ key: "debts", label: "debts", align: "right" },
	{ key: "costs", label: "costs", align: "right" },
	{ key: "net", label: "net", align: "right" },
	{ key: "gifts", label: "gifts", align: "right" },
	{ key: "toHeirs", label: "toHeirs", align: "right" },
	{ key: "realNet", label: "realNet", align: "right" },
	{ key: "realToHeirs", label: "realToHeirs", align: "right" },
]

/** The tables the human form prints as one block instead. */
const HIDDEN_TABLES = ["estate", "estateLines"]

/** The result without its estate tables: the human form prints the estate by year as a block instead. */
export function estateHidden(data: Record<string, unknown>): Record<string, unknown> {
	const tables = data["tables"]
	if (!Array.isArray(tables)) return data
	return {
		...data,
		tables: tables.filter(
			(entry) => !(isRecord(entry) && HIDDEN_TABLES.includes(String(entry["name"]))),
		),
	}
}

/**
 * The estate-by-year block, printed after the body when the result carries the estate table: the rows
 * on each roll-up's end (a monthly run states every month in JSON). Without `--estate` it prints nothing.
 */
export function estateBlocks(data: Record<string, unknown>): string[] {
	const rows = tableRows(data, "estate")
	if (rows === undefined) return []
	const ends = endDatesOf(data)
	const years = rows.filter((row) => ends.has(String(row["date"])))
	return [tableLines("estate", years.length, years, COLUMNS)]
}
