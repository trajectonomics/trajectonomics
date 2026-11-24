import { extent } from "./extent"
import type { LineMarker, LineSeries } from "./line"
import { linePath } from "./path"
import { linearScale } from "./scale"
import { niceTicks } from "./ticks"
import { labelsFor, titlesFor, xTicksFor } from "./x-labels"

/** The space around the plot, in pixels, for the axis labels. */
export interface Margin {
	readonly top: number
	readonly right: number
	readonly bottom: number
	readonly left: number
}

/** The size of the whole chart, in pixels, and its margin. */
export interface Plot {
	readonly width: number
	readonly height: number
	readonly margin: Margin
}

/** One value of a series, placed in pixels, with the string a tooltip shows for it. */
export interface Mark {
	readonly x: number
	readonly y: number
	readonly display: string
}

/** One bar of a column chart, in pixels. */
export interface Bar {
	readonly x: number
	readonly y: number
	readonly width: number
	readonly height: number
	/** True when the bar covers part of a period, so it is drawn faded. */
	readonly faded?: boolean
}

/**
 * One series laid out: its path, and a mark per distinct x (null where the series has no point). A
 * column chart's series also carry their bars, or the shaded band of a stacked line.
 */
export interface SeriesLayout {
	readonly name: string
	readonly dashed: boolean
	readonly dotted: boolean
	readonly path: string
	readonly marks: readonly (Mark | null)[]
	readonly bars?: readonly (Bar | null)[]
	readonly area?: string
}

/** The whole chart laid out: positions, ticks, series and markers, all in pixels. */
export interface LineLayout {
	readonly xLabels: readonly string[]
	/** The longer name of each x for the tooltip, such as the period it covers; absent when the labels say it all. */
	readonly xTitles?: readonly string[]
	readonly xPixels: readonly number[]
	readonly xTicks: readonly { readonly index: number; readonly label: string }[]
	readonly yTicks: readonly { readonly value: number; readonly y: number }[]
	readonly series: readonly SeriesLayout[]
	readonly markers: readonly { readonly x: number; readonly label: string }[]
	/** "wide" draws series from a longer palette, for a chart of many series; left out, the first three. */
	readonly palette?: "wide"
}

/** The room one x label needs, in pixels, so neighbouring labels never touch. */
const X_LABEL_SPACE = 84

/**
 * Lays a line chart out in pixels. The y axis always starts at zero and ends on a nice tick. Each
 * distinct x is one column; a series with no point at an x has a gap there. A marker may sit between
 * columns, so the x axis widens to take it in. Null for no points.
 */
export function lineLayout(
	series: readonly LineSeries[],
	plot: Plot,
	markers: readonly LineMarker[] = [],
	palette?: "wide",
): LineLayout | null {
	const xs = distinctSorted(series.flatMap((line) => line.points.map((point) => point.x)))
	const xDomain = xs.length === 0 ? null : extent([...xs, ...markers.map((marker) => marker.x)])
	const yExtent = extent([0, ...series.flatMap((line) => line.points.map((point) => point.y))])
	if (!xDomain || !yExtent) return null
	const yTicks = niceTicks(yExtent)
	const yDomain = { min: yTicks[0] ?? 0, max: yTicks[yTicks.length - 1] ?? 0 }
	const { margin } = plot
	const scaleX = linearScale(xDomain, { from: margin.left, to: plot.width - margin.right })
	const scaleY = linearScale(yDomain, { from: plot.height - margin.bottom, to: margin.top })
	const xLabels = labelsFor(series, xs)
	const xPixels = xs.map(scaleX)
	const plotWidth = plot.width - margin.left - margin.right
	return {
		xLabels,
		xTitles: titlesFor(series, xs),
		xPixels,
		xTicks: xTicksFor(xLabels, xPixels, Math.max(2, Math.floor(plotWidth / X_LABEL_SPACE))),
		yTicks: yTicks.map((value) => ({ value, y: scaleY(value) })),
		series: series.map((line) => seriesLayout(line, xs, scaleX, scaleY)),
		markers: markers.map((marker) => ({ x: scaleX(marker.x), label: marker.label })),
		...(palette ? { palette } : {}),
	}
}

function distinctSorted(values: readonly number[]): number[] {
	return [...new Set(values)].sort((a, b) => a - b)
}

function seriesLayout(
	line: LineSeries,
	xs: readonly number[],
	scaleX: (value: number) => number,
	scaleY: (value: number) => number,
): SeriesLayout {
	const marks = xs.map((x) => {
		const point = line.points.find((candidate) => candidate.x === x)
		return point ? { x: scaleX(x), y: scaleY(point.y), display: point.display } : null
	})
	const drawn = marks.filter((mark): mark is Mark => mark !== null)
	return {
		name: line.name,
		dashed: line.dashed ?? false,
		dotted: line.dotted ?? false,
		path: linePath(drawn),
		marks,
	}
}
