import type { LineSeries } from "../../chart/line"
import { toChartNumber } from "../../chart/number"
import type { NetWorth, Read } from "../../contract"
import { formatMoney, formatMonth } from "../../format"

/**
 * The month-end net worth history as one chart series. A month whose Read failed has no point, so
 * the line skips it rather than inventing a value. Positions are the month's index in the history.
 */
export function netWorthHistorySeries(reads: readonly Read<NetWorth>[]): LineSeries {
	const points = reads.flatMap((read, index) => {
		const total = read.ok ? read.data.totals?.[0] : undefined
		if (!read.ok || !total) return []
		return [
			{
				x: index,
				xLabel: formatMonth(read.data.asOf),
				y: toChartNumber(total.amount),
				display: formatMoney(total.amount),
			},
		]
	})
	return { name: "Net worth", points }
}

/** The month-end values a sparkline draws, in order: the points the history series holds. */
export function monthEndValues(reads: readonly Read<NetWorth>[]): number[] {
	return netWorthHistorySeries(reads).points.map((point) => point.y)
}
