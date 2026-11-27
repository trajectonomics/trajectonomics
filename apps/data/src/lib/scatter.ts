import { type Axis, axisFor, axisShare } from "./scatter-scale"

export const SCATTER_WIDTH = 720
export const SCATTER_HEIGHT = 360

const PADDING = Object.freeze({ top: 24, right: 24, bottom: 56, left: 80 })
const PLOT_WIDTH = SCATTER_WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = SCATTER_HEIGHT - PADDING.top - PADDING.bottom

/** One dot before it is placed: its plan, its two values and whether it is only a lower bound. */
export type ScatterPoint = {
	key: string
	label: string
	x: number
	y: number
	/** The weekly figure is "most we used", not an estimate, so the dot stays hollow. */
	hollow?: boolean
}

/** A dot placed in the chart's coordinates. */
export type PlottedDot = ScatterPoint & { cx: number; cy: number }

/** The shaded "best value" area and everything the SVG draws. */
export type ScatterGeometry = {
	width: number
	height: number
	xAxis: Axis
	yAxis: Axis
	dots: PlottedDot[]
	plot: { left: number; top: number; right: number; bottom: number }
	best: { x: number; y: number; width: number; height: number }
}

function median(values: readonly number[]): number {
	const sorted = [...values].sort((left, right) => left - right)
	const middle = Math.floor(sorted.length / 2)
	if (sorted.length % 2 === 1) return sorted[middle] as number
	return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
}

function upperThird(axis: Axis): number {
	if (axis.kind === "log") return axis.min * (axis.max / axis.min) ** (2 / 3)
	return axis.min + (axis.max - axis.min) * (2 / 3)
}

/**
 * Places every dot and shades the best-value area: above the median on both axes, or the
 * upper-right third when fewer than three dots leave no median worth drawing.
 */
export function scatterGeometry(
	points: readonly ScatterPoint[],
	xDomain?: readonly [number, number],
): ScatterGeometry | null {
	if (points.length === 0) return null
	const xAxis = axisFor(
		points.map((point) => point.x),
		xDomain,
	)
	const yAxis = axisFor(points.map((point) => point.y))
	if (xAxis === null || yAxis === null) return null
	const x = points.length >= 3 ? median(points.map((point) => point.x)) : upperThird(xAxis)
	const y = points.length >= 3 ? median(points.map((point) => point.y)) : upperThird(yAxis)
	const left = PADDING.left + axisShare(xAxis, x) * PLOT_WIDTH
	const top = PADDING.top + (1 - axisShare(yAxis, y)) * PLOT_HEIGHT
	return {
		width: SCATTER_WIDTH,
		height: SCATTER_HEIGHT,
		xAxis,
		yAxis,
		dots: points.map((point) => ({
			...point,
			cx: PADDING.left + axisShare(xAxis, point.x) * PLOT_WIDTH,
			cy: PADDING.top + (1 - axisShare(yAxis, point.y)) * PLOT_HEIGHT,
		})),
		plot: {
			left: PADDING.left,
			top: PADDING.top,
			right: PADDING.left + PLOT_WIDTH,
			bottom: PADDING.top + PLOT_HEIGHT,
		},
		best: {
			x: left,
			y: PADDING.top,
			width: PADDING.left + PLOT_WIDTH - left,
			height: Math.max(0, top - PADDING.top),
		},
	}
}

/** The chart's one-line description: both axes and every plan in it. */
export function scatterAriaLabel(
	points: readonly ScatterPoint[],
	xTitle: string,
	yTitle: string,
): string {
	const names = points.map((point) => point.label).join(", ")
	return `Scatter chart of ${yTitle} against ${xTitle} for ${points.length} ${points.length === 1 ? "plan" : "plans"}. Plans: ${names}.`
}
