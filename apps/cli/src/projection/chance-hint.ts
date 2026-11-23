import type { ColumnHint, RenderHint } from "../table"

/** The columns of the two spending tables in the human form, headed as their row keys are spelled. */
const SPENDING_COLUMNS: Record<"spendingBands" | "lowestYearSpending", ColumnHint[]> = {
	spendingBands: [
		{ key: "index", label: "index", align: "right" },
		{ key: "to", label: "to" },
		{ key: "p10", label: "p10", align: "right" },
		{ key: "p50", label: "p50", align: "right" },
		{ key: "p90", label: "p90", align: "right" },
	],
	lowestYearSpending: [
		{ key: "paths", label: "paths", align: "right" },
		{ key: "p10", label: "p10", align: "right" },
		{ key: "p25", label: "p25", align: "right" },
		{ key: "p50", label: "p50", align: "right" },
		{ key: "p75", label: "p75", align: "right" },
		{ key: "p90", label: "p90", align: "right" },
	],
}

/** The human form: the Bands table, then the notes that state the success share and definition. */
const column = (key: string, align?: "right") =>
	align === undefined ? { key, label: key } : { key, label: key, align }

export const chanceHint: RenderHint = {
	tables: "tables",
	rows: "rows",
	columns: {
		bands: [
			column("index", "right"),
			column("to"),
			column("p10", "right"),
			column("p50", "right"),
			column("p90", "right"),
		],
		...SPENDING_COLUMNS,
	},
	note: "notes",
}
