import { type ColumnKind, type Frame, type Lane, seriesLayout } from "./column-series"
import { extent } from "./extent"
import type { LineMarker, LineSeries } from "./line"
import type { LineLayout, Plot } from "./line-layout"
import { linearScale } from "./scale"
import { type Span, stackSpans } from "./stack"
import { niceTicks } from "./ticks"
import { labelsFor, titlesFor, xTicksFor } from "./x-labels"

export type { ColumnKind }

/** The distinct x of a column chart's series, in order: each is one column. */
export function columnXs(series: readonly LineSeries[]): number[] {
	return [...new Set(series.flatMap((line) => line.points.map((point) => point.x)))].sort(
		(a, b) => a - b,
	)
}

const X_LABEL_SPACE = 84

/**
 * Lays a column chart out in pixels, as a `LineLayout` whose series also carry their bars or their
 * band. Each distinct x is one column, evenly spaced. The y axis takes in zero and every span. Null for
 * no points. Stacking is for drawing only: a tooltip row is each series' own string. A marker of a bar chart
 * stands inside the column of the period it falls in, as `dayPosition` places it: a position `x` is in the column
 * whose x is the first one at or after it, a fraction of the way along it.
 */
export function columnLayout(
	series: readonly LineSeries[],
	plot: Plot,
	kind: ColumnKind,
	markers: readonly LineMarker[] = [],
): LineLayout | null {
	const xs = columnXs(series)
	const cells = series.map((line) => xs.map((x) => line.points.find((p) => p.x === x) ?? null))
	const values = cells.map((row) => row.map((point) => (point ? point.y : null)))
	const spans = kind === "bars" ? ownSpans(values) : stackSpans(values)
	const bounds = extent([0, ...spans.flatMap((row) => row.flatMap((s) => (s ? [s.lo, s.hi] : [])))])
	if (xs.length === 0 || !bounds) return null
	const ticks = niceTicks(bounds)
	const { margin } = plot
	const scaleY = linearScale(
		{ min: ticks[0] ?? 0, max: ticks[ticks.length - 1] ?? 0 },
		{ from: plot.height - margin.bottom, to: margin.top },
	)
	const plotWidth = plot.width - margin.left - margin.right
	const slot = plotWidth / xs.length
	const xPixels = xs.map((_, column) =>
		kind === "stacked-line" && xs.length > 1
			? margin.left + (column / (xs.length - 1)) * plotWidth
			: margin.left + (column + 0.5) * slot,
	)
	const frame: Frame = { xPixels, scaleY, slot, kind, lanes: lanesOf(cells) }
	const xLabels = labelsFor(series, xs)
	return {
		xLabels,
		xTitles: titlesFor(series, xs),
		xPixels,
		xTicks: xTicksFor(xLabels, xPixels, Math.max(2, Math.floor(plotWidth / X_LABEL_SPACE))),
		yTicks: ticks.map((value) => ({ value, y: scaleY(value) })),
		series: series.map((line, index) =>
			seriesLayout(line, cells[index] ?? [], spans[index] ?? [], index, frame),
		),
		markers: kind === "stacked-line" ? [] : markersIn(markers, xs, xPixels, slot),
		palette: "wide",
	}
}

function ownSpans(values: readonly (readonly (number | null)[])[]): (Span | null)[][] {
	return values.map((row) =>
		row.map((value) =>
			value === null ? null : { lo: Math.min(0, value), hi: Math.max(0, value) },
		),
	)
}

/** Each series' lane in each column: the series with a point in a column share it, in the chart's order. */
function lanesOf(cells: readonly (readonly (unknown | null)[])[]): Lane[][] {
	const columns = cells[0]?.length ?? 0
	const lanes = cells.map(() => Array.from({ length: columns }, () => ({ rank: 0, of: 1 })))
	for (let column = 0; column < columns; column++) {
		const present = cells.flatMap((row, index) => (row[column] ? [index] : []))
		present.forEach((index, rank) => {
			const lane = lanes[index]
			if (lane) lane[column] = { rank, of: present.length }
		})
	}
	return lanes
}

/** The markers that fall inside a column, in pixels. A marker beyond every column is not drawn. */
function markersIn(
	markers: readonly LineMarker[],
	xs: readonly number[],
	xPixels: readonly number[],
	slot: number,
): { x: number; label: string }[] {
	return markers.flatMap((marker) => {
		const column = xs.findIndex((x) => marker.x > x - 1 && marker.x <= x)
		const centre = xPixels[column]
		const x = xs[column]
		if (centre === undefined || x === undefined) return []
		return [
			{
				x: centre - slot / 2 + (marker.x - (x - 1)) * slot,
				label: marker.label,
				...(marker.code === true ? { code: true } : {}),
			},
		]
	})
}
