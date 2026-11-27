import type { ChartSeries } from "./types"

/** The chart's own coordinate space; CSS scales it to the column. */
export const CHART_WIDTH = 720
export const CHART_HEIGHT = 280

const PADDING = Object.freeze({ top: 16, right: 16, bottom: 32, left: 64 })
const Y_TICKS = 4

/** One plotted point in the chart's coordinates. */
export type PlottedPoint = {
	day: string
	tokens: number
	x: number
	y: number
}

/** One plan's plotted line. */
export type PlottedLine = Omit<ChartSeries, "points"> & {
	points: PlottedPoint[]
}

/** A day label under the plot. */
export type XTick = {
	day: string
	x: number
}

/** A value label beside the plot. */
export type YTick = {
	value: number
	y: number
}

/** Everything the SVG draws, computed without a browser. */
export type ChartGeometry = {
	width: number
	height: number
	max: number
	lines: PlottedLine[]
	xTicks: XTick[]
	yTicks: YTick[]
}

/** The smallest round number at or above the value, in the 1, 2, 5, 10 series. */
export function niceMax(value: number): number {
	if (value <= 0) return 0
	const magnitude = 10 ** Math.floor(Math.log10(value))
	const normalised = value / magnitude
	const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10
	return step * magnitude
}

/** The chart's one-line description, naming the window and every plan in it. */
export function chartAriaLabel(series: readonly ChartSeries[], from: string, to: string): string {
	const days = series[0]?.points.length ?? 0
	const names = series.map((line) => line.name).join(", ")
	const unit = days === 1 ? "day" : "days"
	return `Line chart of total tokens per UTC day for ${days} ${unit}, ${from} to ${to}. Plans: ${names}.`
}

function xTicks(days: readonly string[], xFor: (index: number) => number): XTick[] {
	const last = days.length - 1
	const indexes = last <= 0 ? [0] : [...new Set([0, Math.floor(last / 2), last])]
	return indexes.map((index) => ({ day: days[index] as string, x: xFor(index) }))
}

/** Scales the series into the chart's coordinates, or null when there is nothing to draw. */
export function chartGeometry(series: readonly ChartSeries[]): ChartGeometry | null {
	const days = series[0]?.points.map((point) => point.day) ?? []
	if (series.length === 0 || days.length === 0) return null
	const rawMax = Math.max(0, ...series.flatMap((line) => line.points.map((p) => p.tokens)))
	const max = niceMax(rawMax) || 1
	const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right
	const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
	const xFor = (index: number): number =>
		PADDING.left + (days.length === 1 ? innerWidth / 2 : (index / (days.length - 1)) * innerWidth)
	const yFor = (tokens: number): number => PADDING.top + innerHeight - (tokens / max) * innerHeight
	const lines = series.map((line) => ({
		...line,
		points: line.points.map((point, index) => ({
			...point,
			x: xFor(index),
			y: yFor(point.tokens),
		})),
	}))
	const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, index) => {
		const value = max - (max / Y_TICKS) * index
		return { value, y: yFor(value) }
	})
	return {
		width: CHART_WIDTH,
		height: CHART_HEIGHT,
		max,
		lines,
		xTicks: xTicks(days, xFor),
		yTicks,
	}
}
