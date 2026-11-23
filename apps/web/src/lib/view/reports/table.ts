/** One field of an exported table: its name as `traj` states it, such as `openingNetWorth` or `realNetWorth.amount`. */
export interface ReportColumn {
	readonly key: string
	readonly numeric: boolean
}

/** One record of an exported table: each field maps to the string the Snapshot holds for it. */
export type ReportRecord = Readonly<Record<string, string>>

/** A table the page can export: the CLI's table name, a readable label, its fields and its records. */
export interface ReportTable {
	/** The CLI's table name, such as `annual`. It names the file. */
	readonly name: string
	/** The name the page shows, such as "Yearly rows". */
	readonly label: string
	readonly columns: readonly ReportColumn[]
	readonly records: readonly ReportRecord[]
}
