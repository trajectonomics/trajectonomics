import { linePath, type PathPoint } from "../../chart/path"
import { type ChartRow, type Phase, type PlotBox, phasePaths, placeRows } from "./focus-chart-paths"

/** Where the answer label goes: to the right of the stop, to its left, or in the middle of an empty chart. */
export type LabelSide = "left" | "right" | "center"

/** The 10px bar a shortfall draws under zero, from the run-out date to the plan's last year. */
export interface BarSpan {
	readonly x: number
	readonly width: number
	readonly y: number
	readonly height: number
}

/** Everything the chart draws, in pixels, from the rows' chart numbers and the plot's size. */
export interface FocusChartGeometry {
	readonly plot: PlotBox
	readonly zeroY: number
	readonly foreground: Phase
	readonly accent: Phase | null
	readonly stop: PathPoint | null
	readonly label: { readonly x: number; readonly y: number; readonly side: LabelSide } | null
	readonly flag: PathPoint | null
	readonly bar: BarSpan | null
	readonly first: PathPoint | null
	readonly last: PathPoint | null
}

const MARGIN = { left: 12, right: 12, top: 16, bottom: 56 }
const BAR_HEIGHT = 10

/** The chart's geometry: the phased line and fills, the stop point, the answer's side, the flag and the bar. */
export function focusChart(
	rows: readonly ChartRow[],
	stopDate: string | null,
	endDate: string | null,
	width: number,
	height: number,
): FocusChartGeometry {
	const plot: PlotBox = {
		left: MARGIN.left,
		right: width - MARGIN.right,
		top: MARGIN.top,
		bottom: height - MARGIN.bottom,
	}
	const placement = placeRows(rows, plot, stopDate, endDate)
	const phases = phasePaths(placement.points, placement.stop, placement.zeroY)
	const first = placement.points[0] ?? null
	const last = placement.points.at(-1) ?? null
	const anchor = placement.stop ?? last
	return {
		plot,
		zeroY: placement.zeroY,
		...phases,
		stop: placement.stop,
		label: anchor === null ? null : { x: anchor.x, y: anchor.y, side: labelSide(anchor.x, width) },
		flag: last,
		bar:
			placement.stop === null
				? null
				: {
						x: placement.stop.x,
						width: plot.right - placement.stop.x,
						y: placement.zeroY + 4,
						height: BAR_HEIGHT,
					},
		first,
		last,
	}
}

/** The answer sits right of the stop until it passes 62% of the width, then left of it. */
export function labelSide(x: number, width: number): LabelSide {
	return x > width * 0.62 ? "left" : "right"
}

/** The gentle dashed curve of a chart with no plan to draw, from the plot's left to its right. */
export function placeholderPath(plot: PlotBox): string {
	const span = plot.right - plot.left
	const rise = plot.bottom - plot.top
	return linePath([
		{ x: plot.left, y: plot.bottom - rise * 0.2 },
		{ x: plot.left + span * 0.33, y: plot.bottom - rise * 0.48 },
		{ x: plot.left + span * 0.66, y: plot.top + rise * 0.3 },
		{ x: plot.right, y: plot.top + rise * 0.12 },
	])
}

/** A small accent flag at a point: its pole, then a pennant to the right. */
export function flagPath(point: PathPoint): string {
	const { x, y } = point
	return `M${x} ${y} L${x} ${y - 13} L${x + 8} ${y - 10} L${x} ${y - 7} Z`
}
