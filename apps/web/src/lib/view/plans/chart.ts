import { dayPosition, type LineMarker, type LineSeries, toChartNumber } from "../../chart"
import type { ProjectionRun } from "../../contract"
import { formatDate, formatMoney } from "../../format"
import { milestoneView } from "../milestones/milestones"
import { type AnnualRow, annualRowsOf } from "../projection/annual"
import { NOMINAL_NAME } from "../projection/chart"
import { type Range, rowsInRange } from "./range"

/** A plan's chart: net worth at the close of each year in the range, with a rule for each Milestone reached in it. */
export interface PlanChart {
	readonly series: readonly LineSeries[]
	readonly markers: readonly LineMarker[]
}

function point(row: AnnualRow): LineSeries["points"][number] {
	return {
		x: row.index,
		xLabel: row.to.slice(0, 4),
		y: toChartNumber(row.closingNetWorth),
		display: formatMoney(row.closingNetWorth),
		xTitle: `Year to ${formatDate(row.to)}`,
	}
}

/**
 * The chart of one projection over a range. The range only chooses which of the CLI's annual rows are drawn, and a
 * Milestone whose date no drawn row holds has no rule. Null when the run has no annual rows.
 */
export function planChart(run: ProjectionRun, range: Range): PlanChart | null {
	const rows = rowsInRange(annualRowsOf(run), range)
	if (rows.length === 0) return null
	const reached = milestoneView(run)?.reached ?? []
	const markers = reached.flatMap((milestone) => {
		const x = dayPosition(rows, milestone.date)
		return x === null ? [] : [{ x, label: milestone.id }]
	})
	return { series: [{ name: NOMINAL_NAME, points: rows.map(point) }], markers }
}
