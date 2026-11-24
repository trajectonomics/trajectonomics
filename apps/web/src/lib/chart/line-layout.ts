import { extent } from "./extent"
import type { LineLayout, Mark, Plot, SeriesLayout } from "./layout-types"
import type { LineMarker, LineSeries } from "./line"
import { linePath } from "./path"
import { linearScale } from "./scale"
import { niceTicks } from "./ticks"
import { labelsFor, titlesFor, xTicksFor } from "./x-labels"

export type * from "./layout-types"

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
