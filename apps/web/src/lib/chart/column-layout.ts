import { type ColumnKind, type Frame, type Lane, seriesLayout } from "./column-series"
import { extent } from "./extent"
import type { LineSeries } from "./line"
import type { LineLayout, Plot } from "./line-layout"
import { linearScale } from "./scale"
import { type Span, stackSpans } from "./stack"
import { niceTicks } from "./ticks"
import { labelsFor, titlesFor, xTicksFor } from "./x-labels"

export type { ColumnKind }

const X_LABEL_SPACE = 84

/**
 * Lays a column chart out in pixels, as a `LineLayout` whose series also carry their bars or their
 * band. Each distinct x is one column, evenly spaced. The y axis takes in zero and every span. Null for
 * no points. Stacking is for drawing only: a tooltip row is each series' own string.
 */
export function columnLayout(
	series: readonly LineSeries[],
	plot: Plot,
	kind: ColumnKind,
): LineLayout | null {
	const xs = [...new Set(series.flatMap((line) => line.points.map((point) => point.x)))].sort(
		(a, b) => a - b,
	)
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
		markers: [],
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
