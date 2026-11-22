import type { LinePoint, LineSeries } from "../../chart/line"
import { toChartNumber } from "../../chart/number"
import type { TaxYear } from "../../contract"
import { formatMoney, formatMonth } from "../../format"

/** The fewest tax years a chart is drawn for: fewer say nothing a table does not. */
export const MIN_CHART_YEARS = 3

/** Due and owed by tax year, or null when there are too few years to chart. */
export function taxChart(years: readonly TaxYear[]): readonly LineSeries[] | null {
	if (years.length < MIN_CHART_YEARS) return null
	return [
		{ name: "Due", points: years.map((year, index) => point(year, index, year.due)) },
		{
			name: "Owed",
			dashed: true,
			points: years.map((year, index) => point(year, index, year.owed)),
		},
	]
}

function point(year: TaxYear, index: number, amount: string): LinePoint {
	return {
		x: index,
		xLabel: formatMonth(year.to),
		y: toChartNumber(amount),
		display: formatMoney(amount),
	}
}
