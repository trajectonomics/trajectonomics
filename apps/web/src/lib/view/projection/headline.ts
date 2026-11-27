import type { ProjectionRun } from "../../contract"
import { yearOf } from "../../format"
import { annualRowsOf } from "./annual"

/** The headline figures of one projection: the last year's close and the horizon year. */
export interface Headline {
	/** Net worth in future money at the close of the last annual row, and the day that close is on. */
	readonly closing: { readonly amount: string; readonly date: string }
	/** The last year of the plan, read as text from the CLI's horizon: "2053". */
	readonly horizonYear: string
}

/** The headline of a projection, or null when it has no annual row to read the close from. */
export function headlineOf(run: ProjectionRun): Headline | null {
	const last = annualRowsOf(run).at(-1)
	if (!last) return null
	return {
		closing: { amount: last.closingNetWorth, date: last.to },
		horizonYear: yearOf(run.horizon),
	}
}
