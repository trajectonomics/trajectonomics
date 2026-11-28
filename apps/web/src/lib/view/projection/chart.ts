import type { LineSeries } from "../../chart"
import { toChartNumber } from "../../chart"
import type { ProjectionRun } from "../../contract"
import { formatMoney } from "../../format"
import { agesText, axisAge } from "../household/model"
import type { PersonNames } from "../item-names"
import { type AnnualRow, annualRowsOf } from "./annual"
import type { Terms } from "./terms"

/** The name of the future-money series, as the chart's legend shows it. */
export const NOMINAL_NAME = "Net worth in future money"

/** The name of the today's-money series. Drawn dashed, so it is told apart. */
export const REAL_NAME = "Net worth in today's money"

/**
 * The net worth series of a projection, one point per annual row. The x position is the row's
 * index; the x label is the year the row ends in, and its age names each person by the household's
 * words. Only the terms asked for are returned.
 */
export function netWorthSeries(
	run: ProjectionRun,
	terms: Terms,
	people: PersonNames,
): LineSeries[] {
	const rows = annualRowsOf(run)
	const nominal: LineSeries = {
		name: NOMINAL_NAME,
		short: "Future money",
		points: rows.map((row) => nominalPoint(row, people)),
	}
	const real: LineSeries = {
		name: REAL_NAME,
		short: "Today's money",
		dashed: true,
		points: rows.map((row) => realPoint(row, people)),
	}
	if (terms === "nominal") return [nominal]
	if (terms === "real") return [real]
	return [nominal, real]
}

function nominalPoint(row: AnnualRow, people: PersonNames): LineSeries["points"][number] {
	return {
		x: row.index,
		...agePart(row, people),
		y: toChartNumber(row.closingNetWorth),
		display: formatMoney(row.closingNetWorth),
	}
}

function realPoint(row: AnnualRow, people: PersonNames): LineSeries["points"][number] {
	return {
		x: row.index,
		...agePart(row, people),
		y: toChartNumber(row.realNetWorth.amount),
		display: formatMoney(row.realNetWorth.amount),
	}
}

/** The year of a YYYY-MM-DD date, read as text: the CLI's date, not a calendar computation. */
function yearOf(date: string): string {
	return date.slice(0, 4)
}

/** The x label of a row: the first person's age, with the year under it and every person's age in the tooltip. */
function agePart(
	row: AnnualRow,
	people: PersonNames,
): Pick<LineSeries["points"][number], "xLabel" | "xTitle" | "subLabel"> {
	const year = yearOf(row.to)
	const age = axisAge(row.ages, people)
	if (age === null) return { xLabel: year }
	return { xLabel: age, xTitle: `${year}, ${agesText(row.ages, people)}`, subLabel: year }
}
