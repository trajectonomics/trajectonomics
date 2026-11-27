import type { ProjectionRun } from "../../contract"
import { formatDate, yearOf } from "../../format"

/** The projection's headline: its closing net worth at the last annual row, and whether it runs out. */
export interface ProjectionView {
	readonly currency: string
	readonly endDate: string
	/** The CLI's future-money closing net worth, shown as stated. */
	readonly nominal: string
	/** The CLI's today's-money figure at the same row. */
	readonly real: string
	readonly runsOut: { readonly date: string; readonly unmet: string } | null
	/** The last year of the plan, read as text from the CLI's horizon: "2053". */
	readonly horizonYear: string
}

/** The headline of one projection run, or null when the run holds no annual rows. */
export function projectionView(run: ProjectionRun): ProjectionView | null {
	const annual = run.tables.flatMap((table) => (table.name === "annual" ? table.rows : []))
	const last = annual.at(-1)
	if (last === undefined) return null
	return {
		currency: run.currency,
		endDate: formatDate(last.to),
		nominal: last.closingNetWorth,
		real: last.realNetWorth.amount,
		runsOut:
			run.runsOut === null
				? null
				: { date: formatDate(run.runsOut.date), unmet: run.runsOut.unmet },
		horizonYear: yearOf(run.horizon),
	}
}
