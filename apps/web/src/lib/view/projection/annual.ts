import type { ProjectionRun } from "../../contract"

/** One annual row of a projection: a year's roll-up, as the CLI states it. */
export type AnnualRow = Extract<ProjectionRun["tables"][number], { name: "annual" }>["rows"][number]

/** One monthly row of a projection, as the CLI states it. */
export type MonthlyRow = Extract<
	ProjectionRun["tables"][number],
	{ name: "monthly" }
>["rows"][number]

/** The annual rows of a projection, in order. Empty when the annual table is absent. */
export function annualRowsOf(run: ProjectionRun): readonly AnnualRow[] {
	for (const table of run.tables) {
		if (table.name === "annual") return table.rows
	}
	return []
}

/** The monthly rows of a projection, in order. Null when it was run without `--monthly`. */
export function monthlyRowsOf(run: ProjectionRun): readonly MonthlyRow[] | null {
	for (const table of run.tables) {
		if (table.name === "monthly") return table.rows
	}
	return null
}
