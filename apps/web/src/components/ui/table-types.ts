import type { Snippet } from "svelte"

/** One column of a DataTable: its header, and a snippet that renders its cell for a row. */
export interface Column<Row> {
	/** A key unique among the columns. */
	readonly key: string
	readonly header: string
	readonly cell: Snippet<[Row]>
	/** A numeric column is right-aligned, so its figures line up. */
	readonly numeric?: boolean
}
