/**
 * The estate tables of a run (cli ADR 0064): one `estate` row per roll-up end and one `estateLines` row per date and
 * line. Pure reads of the CLI's own text; the page adds no figure (web ADR 0002).
 */
import type { ProjectionRun } from "../../contract"

/** One date of the `estate` table: gross, debts, costs, net, gifts, what heirs receive, and the two real figures. */
export type EstateRow = Extract<ProjectionRun["tables"][number], { name: "estate" }>["rows"][number]

/** One cost or gift on one date. */
export type EstateLineRow = Extract<
	ProjectionRun["tables"][number],
	{ name: "estateLines" }
>["rows"][number]

/** The `estate` rows of a run, in date order. Empty when the run was made without `--estate`. */
export function estateRowsOf(run: ProjectionRun): readonly EstateRow[] {
	for (const table of run.tables) {
		if (table.name === "estate") return table.rows
	}
	return []
}

/** The `estateLines` rows of one date, costs then gifts, in the order the plan states them. */
export function linesOn(run: ProjectionRun, date: string): readonly EstateLineRow[] {
	for (const table of run.tables) {
		if (table.name === "estateLines") return table.rows.filter((row) => row.date === date)
	}
	return []
}

/**
 * The row a date reads: the one on the date, or the first roll-up end after it, and the last row when the date is past
 * the plan's last year. Null when the run states no estate. A date is compared as text, as the CLI wrote it.
 */
export function rowOn(rows: readonly EstateRow[], date: string): EstateRow | null {
	return rows.find((row) => row.date >= date) ?? rows[rows.length - 1] ?? null
}

/** Whether a row's net is negative: the debts and costs are more than everything owned. */
export function isShort(row: EstateRow): boolean {
	return row.net.startsWith("-")
}

/** The shortfall of a negative net, as the CLI's text with its sign taken off. Null when the net is not negative. */
export function shortfallOf(row: EstateRow): string | null {
	return isShort(row) ? row.net.slice(1) : null
}
