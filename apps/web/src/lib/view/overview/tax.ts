import type { ProjectionRun } from "../../contract"
import { formatDate, periodWords } from "../../format"

/** The first settlement period of a run, as the Tax card states it. */
export interface TaxPeriod {
	readonly levy: string
	readonly owed: string
	readonly period: string
	readonly settlement: string
	readonly settled: boolean
	readonly partial: boolean
}

/** The Tax card's reading of one projection run: its status and its first period, if it has one. */
export interface TaxView {
	readonly currency: string
	readonly status: string
	readonly first: TaxPeriod | null
}

const STATUS_LABELS: Readonly<Record<ProjectionRun["tax"], string>> = {
	applied: "Tax applied",
	mixed: "Tax mixed",
	not_applied: "Tax not applied",
}

/** The tax reading of one projection run. */
export function taxView(run: ProjectionRun): TaxView {
	const row = run.taxYears.at(0)
	return {
		currency: run.currency,
		status: STATUS_LABELS[run.tax],
		first:
			row === undefined
				? null
				: {
						levy: row.levy,
						owed: row.owed,
						period: periodWords(row.from, row.to),
						settlement: formatDate(row.settlementDate),
						settled: row.settled,
						partial: row.partial,
					},
	}
}
