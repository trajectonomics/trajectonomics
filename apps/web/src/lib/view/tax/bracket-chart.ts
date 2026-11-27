import type { LinePoint, LineSeries, StepLine } from "../../chart"
import { toChartNumber } from "../../chart"
import type { TaxYear } from "../../contract"
import { formatMoney, formatMonth, isAboveZero } from "../../format"
import { rateWords } from "./rate-words"
import { periodOf } from "./tax-rows"

/** Taxable income by bracket for every tax year, with the top rate of each year as a step line on a second axis. */
export interface BracketChart {
	readonly series: readonly LineSeries[]
	readonly step: StepLine | null
}

/** The tax years the CLI stated brackets for: a chart is drawn from these and none is guessed. */
function bracketed(
	years: readonly TaxYear[],
): readonly (TaxYear & { brackets: NonNullable<TaxYear["brackets"]> })[] {
	return years.flatMap((year) => (year.brackets ? [{ ...year, brackets: year.brackets }] : []))
}

function label(year: TaxYear): { xLabel: string; xTitle: string } {
	return { xLabel: formatMonth(year.to), xTitle: periodOf(year) }
}

/**
 * The chart of every tax year the CLI stated brackets for, or null when no year has income in a bracket. A bracket
 * reached in some year is a series by its rate, lowest first, and a year it was not reached in has none of it. Figures are in future money: a tax year states no
 * today's-money one. The step line is each year's top rate, left out when no year states one.
 */
export function bracketChart(years: readonly TaxYear[]): BracketChart | null {
	const shown = bracketed(years)
	if (shown.length === 0) return null
	const reached = shown.flatMap((year) => year.brackets.filter((b) => isAboveZero(b.income)))
	if (reached.length === 0) return null
	const rates = [...new Set(reached.map((bracket) => bracket.rateBps))].sort((a, b) => a - b)
	const series = rates.map((rate): LineSeries => {
		const points = shown.map((year, x): LinePoint => {
			const bracket = year.brackets.find((candidate) => candidate.rateBps === rate)
			const income = bracket?.income ?? "0.00"
			return { x, ...label(year), y: toChartNumber(income), display: formatMoney(income) }
		})
		return { name: `Taxed at ${rateWords(rate)}`, points }
	})
	const stated = shown.flatMap((year, x) =>
		year.marginalRateBps === undefined
			? []
			: [{ x, ...label(year), y: year.marginalRateBps, display: rateWords(year.marginalRateBps) }],
	)
	const step: StepLine | null =
		stated.length === 0
			? null
			: { line: { name: "Top rate", dashed: true, points: stated }, label: rateWords }
	return { series, step }
}
