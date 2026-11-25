import { createRawSnippet } from "svelte"
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

/** The DataTable columns for a table's shown fields: each cell is the record's string for its field, as stated. */
export function dataColumns(columns: readonly ReportColumn[]): Column<ReportRow>[] {
	return columns.map((column) => ({
		key: column.key,
		header: column.key,
		numeric: column.numeric,
		cell: createRawSnippet<[ReportRow]>((row) => ({
			render: () => escapeHtml(row().record[column.key] ?? ""),
		})),
	}))
}
