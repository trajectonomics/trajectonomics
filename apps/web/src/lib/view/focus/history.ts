import { areaPath, linePath, type PathPoint } from "../../chart/path"

/** The box a focus picture draws in, in its own pixels. */
export interface FocusPlot {
	readonly left: number
	readonly right: number
	readonly top: number
	readonly bottom: number
}

/** One month-end of the history as the picture places it: the month's index, its value, and its label. */
export interface FocusHistoryPoint {
	/** The month's index in the history, so a month that could not be read leaves its gap. */
	readonly x: number
	readonly y: number
	/** The month's name, such as "Oct 2026", on the dot's mark. */
	readonly label: string
}

/** The month-end history as the Net worth focus point draws it: one line, its fill, and its last point. */
export interface FocusHistory {
	readonly plot: FocusPlot
	readonly line: string
	readonly area: string
	/** The point the dot and its mark sit on. */
	readonly last: PathPoint & { readonly label: string }
	/** The y the fill closes at: zero's own line, not the plot's bottom. */
	readonly zero: number
}

/** The band above the plot that the answer sits in, so the line never runs through it. */
const FOCUS_ANSWER_BAND = 64

const MARGIN = { left: 10, right: 10, top: FOCUS_ANSWER_BAND, bottom: 10 }

/**
 * The line and the fill under it from the month-end points, in the picture's pixels. Positions only: every
 * value is a chart number placed through `toChartNumber`, and nothing here is shown (web ADR 0002). The x is
 * the month's index in the whole history, so a failed month leaves a gap rather than closing it.
 */
export function historyFocus(
	points: readonly FocusHistoryPoint[],
	months: number,
	width: number,
	height: number,
): FocusHistory | null {
	if (points.length === 0) return null
	const plot: FocusPlot = {
		left: MARGIN.left,
		right: Math.max(MARGIN.left + 1, width - MARGIN.right),
		top: MARGIN.top,
		bottom: Math.max(MARGIN.top + 1, height - MARGIN.bottom),
	}
	const values = points.map((point) => point.y)
	const low = Math.min(0, ...values)
	const high = Math.max(0, ...values)
	const span = high - low
	const yOf = (value: number): number =>
		span === 0
			? (plot.top + plot.bottom) / 2
			: plot.bottom - ((value - low) / span) * (plot.bottom - plot.top)
	const step = Math.max(1, months - 1)
	const placed = points.map((point) => ({
		x: plot.left + (point.x / step) * (plot.right - plot.left),
		y: yOf(point.y),
	}))
	const last = placed.at(-1) ?? { x: plot.right, y: plot.bottom }
	const zero = yOf(0)
	return {
		plot,
		line: linePath(placed),
		area: areaPath(placed, zero),
		last: { ...last, label: points.at(-1)?.label ?? "" },
		zero,
	}
}
