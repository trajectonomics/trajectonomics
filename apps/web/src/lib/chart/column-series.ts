import type { LinePoint, LineSeries } from "./line"
import type { Bar, SeriesLayout } from "./line-layout"
import { bandPath, linePath } from "./path"
import type { Span } from "./stack"

/** The share of a column's width the bars fill. */
const FILL = 0.8

/** How a column chart draws its series: side by side, stacked as bars, or stacked as shaded bands. */
export type ColumnKind = "bars" | "stacked-bars" | "stacked-line"

/** A series' place among the series that have a bar in one column: its rank, and how many there are. */
export interface Lane {
	readonly rank: number
	readonly of: number
}

/** What one series is drawn from: where the columns sit, and each series' lane in each column. */
export interface Frame {
	readonly xPixels: readonly number[]
	readonly scaleY: (value: number) => number
	readonly slot: number
	readonly kind: ColumnKind
	/** `lanes[series][column]`: side by side bars share a column only with the series that have a value in it. */
	readonly lanes: readonly (readonly Lane[])[]
}

/** One series of a column chart: its marks, and its bars or its shaded band. */
export function seriesLayout(
	line: LineSeries,
	points: readonly (LinePoint | null)[],
	spans: readonly (Span | null)[],
	index: number,
	frame: Frame,
): SeriesLayout {
	const { xPixels, scaleY, kind } = frame
	const marks = spans.map((span, column) => {
		const point = points[column]
		const x = xPixels[column]
		return span && point && x !== undefined
			? { x, y: scaleY(span.hi), display: point.display }
			: null
	})
	const base = {
		name: line.name,
		dashed: line.dashed ?? false,
		dotted: line.dotted ?? false,
		marks,
	}
	if (kind !== "stacked-line") {
		return {
			...base,
			path: "",
			bars: spans.map((span, column) =>
				barOf(span, points[column]?.partial === true, column, frame.lanes[index]?.[column], frame),
			),
		}
	}
	const edges = spans.flatMap((span, column) => {
		const x = xPixels[column]
		return span && x !== undefined ? [{ x, hi: scaleY(span.hi), lo: scaleY(span.lo) }] : []
	})
	const top = edges.map((edge) => ({ x: edge.x, y: edge.hi }))
	const bottom = edges.map((edge) => ({ x: edge.x, y: edge.lo }))
	return { ...base, path: linePath(top), area: bandPath(top, bottom) }
}

function barOf(
	span: Span | null,
	faded: boolean,
	column: number,
	lane: Lane | undefined,
	frame: Frame,
): Bar | null {
	const centre = frame.xPixels[column]
	if (!span || centre === undefined) return null
	const side = frame.kind === "bars" && lane ? lane : { rank: 0, of: 1 }
	const width = (frame.slot * FILL) / side.of
	const left = centre - (frame.slot * FILL) / 2 + side.rank * width
	const top = frame.scaleY(span.hi)
	return { x: left, y: top, width, height: Math.max(frame.scaleY(span.lo) - top, 0), faded }
}
