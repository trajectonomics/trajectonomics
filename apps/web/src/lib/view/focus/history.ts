import { areaPath, linePath, type PathPoint } from "../../chart/path"

/** The box a focus picture draws in, in its own pixels. */
export interface FocusPlot {
	readonly left: number
	readonly right: number
	readonly top: number
	readonly bottom: number
}

/** The month-end history as the Net worth focus point draws it: one line, its fill, and its last point. */
export interface FocusHistory {
	readonly plot: FocusPlot
	readonly line: string
	readonly area: string
	/** The point the dot and the answer sit on. */
	readonly last: PathPoint
}

/** The band above the plot that the answer sits in, so the line never runs through it. */
const FOCUS_ANSWER_BAND = 64

const MARGIN = { left: 10, right: 10, top: FOCUS_ANSWER_BAND, bottom: 10 }

/**
 * The line and the fill under it from the month-end values, in the picture's pixels. Positions only: every
 * value is a chart number placed through `toChartNumber`, and nothing here is shown (web ADR 0002).
 */
export function historyFocus(
	values: readonly number[],
	width: number,
	height: number,
): FocusHistory | null {
	if (values.length === 0) return null
	const plot: FocusPlot = {
		left: MARGIN.left,
		right: Math.max(MARGIN.left + 1, width - MARGIN.right),
		top: MARGIN.top,
		bottom: Math.max(MARGIN.top + 1, height - MARGIN.bottom),
	}
	const low = Math.min(0, ...values)
	const high = Math.max(0, ...values)
	const span = high - low
	const yOf = (value: number): number =>
		span === 0
			? (plot.top + plot.bottom) / 2
			: plot.bottom - ((value - low) / span) * (plot.bottom - plot.top)
	const step = values.length === 1 ? 0 : (plot.right - plot.left) / (values.length - 1)
	const points = values.map((value, index) => ({ x: plot.left + index * step, y: yOf(value) }))
	const last = points.at(-1) ?? { x: plot.right, y: plot.bottom }
	return {
		plot,
		line: linePath(points),
		area: areaPath(points, plot.bottom),
		last,
	}
}
