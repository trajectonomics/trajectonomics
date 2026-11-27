import { dayNumber } from "../../chart/date-position"

/** One annual row as the chart places it: the year it closes, and its closing net worth as a chart number. */
export interface ChartRow {
	readonly to: string
	readonly y: number
}

/** The box the line is drawn in, in pixels. */
export interface PlotBox {
	readonly left: number
	readonly right: number
	readonly top: number
	readonly bottom: number
}

export interface Extent {
	readonly low: number
	readonly high: number
}

/** The line's values span zero and every row, so the zero is on the chart and a run-out reaches it. */
export function extentOf(rows: readonly ChartRow[]): Extent {
	const values = rows.map((row) => row.y)
	return { low: Math.min(0, ...values), high: Math.max(0, ...values) }
}

/** The first close of the rows and the plan's last day: the axis's two ends. */
export function axisOf(
	rows: readonly ChartRow[],
	endDate: string | null,
): { start: number; end: number } {
	const first = rows[0]
	const last = rows.at(-1)
	if (first === undefined || last === undefined) return { start: 0, end: 1 }
	const start = dayNumber(first.to)
	const end = dayNumber(endDate === null || endDate < last.to ? last.to : endDate)
	return { start, end: Math.max(start + 1, end) }
}

/** The x position of a day: linear from the first close to the plan's last day. */
export function xOf(
	day: string,
	rows: readonly ChartRow[],
	endDate: string | null,
	plot: PlotBox,
): number {
	const axis = axisOf(rows, endDate)
	const share = Math.min(Math.max((dayNumber(day) - axis.start) / (axis.end - axis.start), 0), 1)
	return plot.left + share * (plot.right - plot.left)
}

/** The y position of a value: linear from zero and the rows' lowest to their highest. */
export function yAt(value: number, extent: Extent, plot: PlotBox): number {
	const span = extent.high - extent.low
	if (span === 0) return (plot.top + plot.bottom) / 2
	return plot.bottom - ((value - extent.low) / span) * (plot.bottom - plot.top)
}

/** The line's height on a day, interpolated between the closes of the two rows around it. */
export function stopY(
	rows: readonly ChartRow[],
	day: string,
	extent: Extent,
	plot: PlotBox,
): number {
	const at = rows.findIndex((row) => row.to >= day)
	if (at < 0) return yAt(rows.at(-1)?.y ?? 0, extent, plot)
	if (at === 0) return yAt(rows[0]?.y ?? 0, extent, plot)
	const next = rows[at]
	const previous = rows[at - 1]
	if (next === undefined || previous === undefined) return yAt(rows.at(-1)?.y ?? 0, extent, plot)
	const from = dayNumber(previous.to)
	const to = dayNumber(next.to)
	const share = to === from ? 0 : (dayNumber(day) - from) / (to - from)
	return yAt(previous.y + (next.y - previous.y) * share, extent, plot)
}
