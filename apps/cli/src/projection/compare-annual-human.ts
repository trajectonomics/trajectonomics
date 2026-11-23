import { type ColumnHint, isRecord, tableLines } from "../table/lines"

/*
 * The human view of a compare's `tables.annual` (cli ADR-0027, ADR-0049 amended): one table after the
 * figures, showing each side's closing net worth and its change. Only the human Format reads it;
 * `--json` keeps every figure in the rows.
 */

/** The human columns of the annual table: the closing net worth and its change, nothing else. */
const annualColumns: readonly ColumnHint[] = [
	{ key: "index", label: "index", align: "right" },
	{ key: "from", label: "from" },
	{ key: "to", label: "to" },
	{ key: "closingA", label: "closing A", align: "right" },
	{ key: "closingB", label: "closing B", align: "right" },
	{ key: "change", label: "change", align: "right" },
]

/** The sentence under the annual table: a blank change is a year the sides do not share. */
const ANNUAL_NOTE =
	"A blank change is a year whose period differs between the sides, or that only one side has."

/** A compare's annual row, flattened to the closing net worth and its change for a person. */
function humanRowOf(row: unknown): Record<string, unknown> {
	const record = isRecord(row) ? row : {}
	const closing = isRecord(record["closingNetWorth"]) ? record["closingNetWorth"] : {}
	return {
		index: record["index"],
		from: record["from"],
		to: record["to"],
		closingA: closing["a"],
		closingB: closing["b"],
		change: closing["delta"],
	}
}

/**
 * `projection compare`'s human view of the annual roll-up: one table after the figures, printed
 * from the result as the command returned it.
 */
export function compareAnnualBlocks(data: Record<string, unknown>): string[] {
	const tables = data["tables"]
	if (!Array.isArray(tables)) return []
	return tables.flatMap((entry) => {
		if (!isRecord(entry) || entry["name"] !== "annual" || !Array.isArray(entry["rows"])) return []
		const rows = entry["rows"]
		const count = typeof entry["count"] === "number" ? entry["count"] : rows.length
		return [tableLines("annual", count, rows.map(humanRowOf), annualColumns), ANNUAL_NOTE]
	})
}

/** The result without its tables: the human body states the figures, and the table prints after. */
export function compareTablesHidden(data: Record<string, unknown>): Record<string, unknown> {
	const { tables: _tables, ...rest } = data
	return rest
}
