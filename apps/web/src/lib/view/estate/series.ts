/** What heirs would receive in each year, as the line chart draws it: one point per roll-up end, the CLI's text on hover. */
import type { LineMarker, LineSeries } from "../../chart"
import { toChartNumber } from "../../chart"
import type { ProjectionRun } from "../../contract"
import { formatMoney } from "../../format"
import type { Terms } from "../projection/terms"
import { type EstateRow, estateRowsOf } from "./rows"

/** The name of the nominal series, as the chart's legend shows it. */
export const HEIRS_NAME = "What heirs receive"
/** The name of the series in today's money, drawn dashed. */
export const HEIRS_REAL_NAME = "What heirs receive, in today's money"

function pointOf(row: EstateRow, index: number, amount: string): LineSeries["points"][number] {
	return {
		x: index,
		xLabel: row.date.slice(0, 4),
		y: toChartNumber(amount),
		display: formatMoney(amount),
	}
}

/** The series of what heirs would receive by year, for the terms asked for. */
export function heirsSeries(run: ProjectionRun, terms: Terms): LineSeries[] {
	const rows = estateRowsOf(run)
	const nominal: LineSeries = {
		name: HEIRS_NAME,
		points: rows.map((row, index) => pointOf(row, index, row.toHeirs)),
	}
	const real: LineSeries = {
		name: HEIRS_REAL_NAME,
		dashed: true,
		points: rows.map((row, index) => pointOf(row, index, row.realToHeirs)),
	}
	if (terms === "nominal") return [nominal]
	if (terms === "real") return [real]
	return [nominal, real]
}

/** A mark at the date the page reads, on the same x the series use. Empty when no row holds the date. */
export function chosenMarker(run: ProjectionRun, date: string): LineMarker[] {
	const index = estateRowsOf(run).findIndex((row) => row.date === date)
	return index < 0 ? [] : [{ x: index, label: date.slice(0, 4) }]
}
