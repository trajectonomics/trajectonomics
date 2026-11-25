import type { ReportColumn } from "./table"

/** The hidden fields after one field is shown or hidden: a hidden field becomes shown, and the reverse. */
export function toggleHidden(hidden: readonly string[], key: string): string[] {
	return hidden.includes(key) ? hidden.filter((name) => name !== key) : [...hidden, key]
}

/** The fields a table exports and previews: every field except the hidden ones, in the table's order. */
export function shownColumns(
	columns: readonly ReportColumn[],
	hidden: readonly string[],
): ReportColumn[] {
	return columns.filter((column) => !hidden.includes(column.key))
}
