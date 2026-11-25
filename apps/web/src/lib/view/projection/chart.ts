import type { LineSeries } from "../../chart"
import { toChartNumber } from "../../chart"
import type { ProjectionRun } from "../../contract"
import { formatMoney } from "../../format"
import { agesText, axisAge } from "../household/model"
import { type AnnualRow, annualRowsOf } from "./annual"
import type { Terms } from "./terms"

/** The name of the nominal series, as the chart's legend shows it. */
export const NOMINAL_NAME = "Nominal net worth"

/** The name of the real series: net worth in As-of terms. Drawn dashed, so it is told apart. */
export const REAL_NAME = "Real net worth, in As-of terms"

/**
 * The net worth series of a projection, one point per annual row. The x position is the row's
 * index; the x label is the year the row ends in. Only the terms asked for are returned.
 */
export function netWorthSeries(run: ProjectionRun, terms: Terms): LineSeries[] {
	const rows = annualRowsOf(run)
	const nominal: LineSeries = { name: NOMINAL_NAME, points: rows.map(nominalPoint) }
	const real: LineSeries = { name: REAL_NAME, dashed: true, points: rows.map(realPoint) }
	if (terms === "nominal") return [nominal]
	if (terms === "real") return [real]
	return [nominal, real]
}

function nominalPoint(row: AnnualRow): LineSeries["points"][number] {
	return {
		x: row.index,
		...agePart(row),
		y: toChartNumber(row.closingNetWorth),
		display: formatMoney(row.closingNetWorth),
	}
}

function realPoint(row: AnnualRow): LineSeries["points"][number] {
	return {
		x: row.index,
		...agePart(row),
		y: toChartNumber(row.realNetWorth.amount),
		display: formatMoney(row.realNetWorth.amount),
	}
}

/** The year of a YYYY-MM-DD date, read as text: the CLI's date, not a calendar computation. */
function yearOf(date: string): string {
	return date.slice(0, 4)
}

/** The x label of a row: its year, with the first person's age under it and every person's age in the tooltip. */
function agePart(
	row: AnnualRow,
): Pick<LineSeries["points"][number], "xLabel" | "xTitle" | "subLabel"> {
	const year = yearOf(row.to)
	const sub = axisAge(row.ages)
	if (sub === null) return { xLabel: year }
	return { xLabel: year, xTitle: `${year}, ${agesText(row.ages)}`, subLabel: sub }
}
