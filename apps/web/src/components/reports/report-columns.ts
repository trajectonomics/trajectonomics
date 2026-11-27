import { createRawSnippet } from "svelte"
import { formatDate } from "../../lib/format"
import type { ReportColumn } from "../../lib/view/reports/table"
import type { Column } from "../ui/table-types"

/** One row of a report preview: its position, and the record's strings by field name. */
export interface ReportRow {
	readonly id: number
	readonly record: Readonly<Record<string, string>>
}

/** Text as HTML, with the characters that would open markup escaped. */
export function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
}

/** The fields that hold a date, whose cell the preview prints in the Dashboard's date format. */
const DATE_KEYS = new Set(["date", "from", "to", "settlementDate", "realNetWorth.date"])

/** The preview's text for one cell: a date is formatted for display, and every other string is shown as stated. */
function cellText(column: ReportColumn, record: Readonly<Record<string, string>>): string {
	const text = record[column.key] ?? ""
	return DATE_KEYS.has(column.key) ? formatDate(text) : text
}

/** The DataTable columns for a table's shown fields: each cell is the record's string for its field, with its dates written out. */
export function dataColumns(columns: readonly ReportColumn[]): Column<ReportRow>[] {
	return columns.map((column) => ({
		key: column.key,
		header: column.key,
		numeric: column.numeric,
		cell: createRawSnippet<[ReportRow]>((row) => ({
			render: () => escapeHtml(cellText(column, row().record)),
		})),
	}))
}
