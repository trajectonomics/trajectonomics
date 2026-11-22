import type { ProjectionRun } from "../../contract"
import { formatDate } from "../../format"

/** The projection's headline: its closing net worth at the last annual row, and whether it runs out. */
export interface ProjectionView {
	readonly currency: string
	readonly endDate: string
	/** The CLI's nominal closing net worth, shown as stated. */
	readonly nominal: string
	/** The CLI's real figure at the same row, shown beside the nominal one as in As-of terms. */
	readonly real: string
	readonly runsOut: { readonly date: string; readonly unmet: string } | null
	readonly horizon: string
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
		horizon: formatDate(run.horizon),
	}
}
