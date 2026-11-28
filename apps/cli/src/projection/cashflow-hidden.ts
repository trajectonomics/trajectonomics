import { isRecord } from "../table/lines"

/*
 * The tables `--breakdown` and the Reporting flags state for JSON only (cli ADR-0058, ADR-0086). The
 * human view prints blocks instead, so it hides these from the table list it shows.
 */

/** The cash-flow tables a person does not read: the long lines and the totals are JSON's; the blocks print instead. */
const HIDDEN_TABLES = [
	"cashflow",
	"cashflowTotals",
	"transfers",
	"cashflowYears",
	"cashflowYearTotals",
	"cashflowYearTransfers",
	"cashflowMonths",
	"cashflowMonthTotals",
	"cashflowMonthTransfers",
]

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
