import { blockLines, type ColumnHint, isRecord } from "../table/lines"
import { tableRows } from "./cashflow-human"
import { textOf } from "./cashflow-human-rows"
import { groupsOf, PARTIAL_NOTE, type SpanGroup, totalsOf } from "./cashflow-span-support"

/*
 * `--breakdown-months`'s human view (cli ADR-0086): one table of months per Reporting year, the six
 * figures a person compares across a year. A month the As-of, the horizon or the run-out date cut is
 * marked with a star and the note under the table says so. The totals rows state every month, so a
 * month with no line still gets its row of zeros.
 */

const MONTH_COLUMNS: readonly ColumnHint[] = [
	{ key: "month", label: "month" },
	{ key: "money in", label: "money in", align: "right" },
	{ key: "tax", label: "tax", align: "right" },
	{ key: "spending", label: "spending", align: "right" },
	{ key: "saving", label: "saving", align: "right" },
	{ key: "left over", label: "left over", align: "right" },
	{ key: "unmet", label: "unmet", align: "right" },
]

/** One Reporting year's months, one row each, from the year's totals rows. */
function monthTable(span: SpanGroup): string {
	const keys = [...new Set(span.rows.map((row) => String(row["month"])))]
	const rows = keys.map((key) => {
		const monthRows = span.rows.filter((row) => row["month"] === key)
		const amountOf = totalsOf(monthRows)
		const partial = monthRows.some((row) => row["partial"] === true)
		return {
			month: partial ? `${key}*` : key,
			"money in": amountOf("money in"),
			tax: amountOf("tax"),
			spending: amountOf("spending"),
			saving: amountOf("saving"),
			"left over": amountOf("left over"),
			unmet: amountOf("unmet"),
		}
	})
	const text = blockLines(`cash flow by month, ${span.year}`, rows, MONTH_COLUMNS)
	const partial = span.rows.some((row) => row["partial"] === true)
	return partial ? `${text}\n${PARTIAL_NOTE}` : text
}

/** The line a run that ran out before the Reporting year asked for prints instead of a month table. */
function runOutLine(data: Record<string, unknown>): string[] {
	const runsOut = data["runsOut"]
	if (!isRecord(runsOut)) return []
	return [
		`no months: the money runs out on ${textOf(runsOut["date"], "date")}, before the Reporting year asked for.`,
	]
}

/** One table per Reporting year, or the run-out line when the engine reported no month. */
export function monthBlocks(data: Record<string, unknown>): string[] {
	const months = tableRows(data, "cashflowMonths")
	if (months === undefined) return []
	if (months.length === 0) return runOutLine(data)
	const totals = tableRows(data, "cashflowMonthTotals") ?? []
	return groupsOf(totals).map(monthTable)
}
