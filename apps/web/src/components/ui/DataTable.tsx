import type { ReactNode } from "react"
import { cx } from "./cx"

export interface Column<Row> {
	/** A key unique among the columns. */
	readonly key: string
	readonly header: string
	readonly cell: (row: Row) => ReactNode
	/** A numeric column is right-aligned, so its figures line up. */
	readonly numeric?: boolean
}

export interface DataTableProps<Row> {
	/** Names the table for a screen reader, and shows above it. */
	readonly caption: string
	readonly columns: readonly Column<Row>[]
	readonly rows: readonly Row[]
	readonly rowKey: (row: Row) => string
}

/**
 * A semantic table with a sticky header. It scrolls inside its own wrapper, both ways, so the page
 * itself never scrolls sideways.
 */
export function DataTable<Row>({ caption, columns, rows, rowKey }: DataTableProps<Row>) {
	return (
		<div className="max-h-[70vh] max-w-full overflow-auto rounded-lg border border-border">
			<table className="w-full min-w-max border-collapse text-sm">
				<caption className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
					{caption}
				</caption>
				<thead className="sticky top-0 z-10 bg-card">
					<tr>
						{columns.map((column) => (
							<th
								key={column.key}
								scope="col"
								className={cx(
									"border-b border-border px-3 py-2 font-medium text-muted-foreground",
									column.numeric ? "text-right" : "text-left",
								)}
							>
								{column.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={rowKey(row)} className="border-b border-border last:border-0">
							{columns.map((column) => (
								<td
									key={column.key}
									className={cx("px-3 py-2 align-top", column.numeric && "text-right tabular-nums")}
								>
									{column.cell(row)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
