import { cell } from "./escape"

/** One column of a table-shaped Result: its row key, its heading, and how it is padded. */
export type ColumnHint = {
	key: string
	label: string
	align?: "left" | "right"
	/**
	 * How the value reads as text, for a value a plain cell cannot show, such as a list. It only
	 * chooses the text: the cell is escaped and padded as any other.
	 */
	show?: (value: unknown) => unknown
	/**
	 * A column only some rows state (such as a field present when the Scenario declares a Flow kind).
	 * It prints when at least one row has its key, so a result that never states it keeps its bytes.
	 */
	optional?: boolean
}

type Cells = readonly (readonly string[])[]

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function cellsOf(row: unknown, columns: readonly ColumnHint[]): readonly string[] {
	const record = isRecord(row) ? row : {}
	return columns.map((column) =>
		cell(column.show === undefined ? record[column.key] : column.show(record[column.key])),
	)
}

function padded(value: string, width: number, align: ColumnHint["align"]): string {
	const padding = " ".repeat(Math.max(width - Bun.stringWidth(value), 0))
	return align === "right" ? `${padding}${value}` : `${value}${padding}`
}

// Bun.stringWidth counts display columns, so Thai combining marks do not skew the padding.
function widthsOf(columns: readonly ColumnHint[], cells: Cells): readonly number[] {
	return columns.map((column, index) =>
		Math.max(
			Bun.stringWidth(column.label),
			...cells.map((row) => Bun.stringWidth(row[index] ?? "")),
		),
	)
}

function line(
	values: readonly string[],
	columns: readonly ColumnHint[],
	widths: readonly number[],
): string {
	const paddedCells = values.map((value, index) =>
		padded(value, widths[index] ?? 0, columns[index]?.align ?? "left"),
	)
	return paddedCells.join("  ").trimEnd()
}

/** The columns a table prints: every column, except the optional ones no row states. */
function shownColumns(columns: readonly ColumnHint[], rows: readonly unknown[]): ColumnHint[] {
	return columns.filter(
		(column) =>
			column.optional !== true ||
			rows.some((row) => isRecord(row) && Object.hasOwn(row, column.key)),
	)
}

function tableText(
	heading: string,
	rows: readonly unknown[],
	allColumns: readonly ColumnHint[],
): string {
	const columns = shownColumns(allColumns, rows)
	const cells = rows.map((row) => cellsOf(row, columns))
	const widths = widthsOf(columns, cells)
	const header = line(
		columns.map((column) => column.label),
		columns,
		widths,
	)
	return [heading, header, ...cells.map((row) => line(row, columns, widths))].join("\n")
}

export function tableLines(
	name: string,
	count: number,
	rows: readonly unknown[],
	allColumns: readonly ColumnHint[],
): string {
	return tableText(`${name} (${count} ${count === 1 ? "row" : "rows"})`, rows, allColumns)
}

/** A table whose heading the caller states whole, with no row count: a block whose heading already says its span. */
export function blockLines(
	heading: string,
	rows: readonly unknown[],
	allColumns: readonly ColumnHint[],
): string {
	return tableText(heading, rows, allColumns)
}
