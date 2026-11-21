import type { ProjectionRun } from "../../contract"
import { annualRowsOf } from "./annual"

/** The headline figures of one projection: the last year's close, its real figure and the run-out. */
export interface Headline {
	/** Nominal net worth at the close of the last annual row, and the day that close is on. */
	readonly closing: { readonly amount: string; readonly date: string }
	/** The same row's net worth in As-of terms, and the monthly row the CLI measured it at. */
	readonly real: { readonly amount: string; readonly date: string }
	/** Where the money runs out and how much is unmet, or null when it does not run out. */
	readonly runsOut: { readonly date: string; readonly unmet: string } | null
	readonly horizon: string
}

/** The headline of a projection, or null when it has no annual row to read the close from. */
export function headlineOf(run: ProjectionRun): Headline | null {
	const last = annualRowsOf(run).at(-1)
	if (!last) return null
	return {
		closing: { amount: last.closingNetWorth, date: last.to },
		real: { amount: last.realNetWorth.amount, date: last.realNetWorth.date },
		runsOut: run.runsOut,
		horizon: run.horizon,
	}
}
