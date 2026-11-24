import type { LinePoint, LineSeries } from "./line"
import type { Bar, SeriesLayout } from "./line-layout"
import { bandPath, linePath } from "./path"
import type { Span } from "./stack"

/** The share of a column's width the bars fill. */
const FILL = 0.8

/** How a column chart draws its series: side by side, stacked as bars, or stacked as shaded bands. */
export type ColumnKind = "bars" | "stacked-bars" | "stacked-line"

/** What one series is drawn from: its point and span in each column, and where the columns sit. */
export interface Frame {
	readonly xPixels: readonly number[]
	readonly scaleY: (value: number) => number
	readonly slot: number
	readonly kind: ColumnKind
	readonly count: number
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
	const base = { name: line.name, dashed: line.dashed ?? false, marks }
	if (kind !== "stacked-line") {
		return {
			...base,
			path: "",
			bars: spans.map((span, column) => barOf(span, column, index, frame)),
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

function barOf(span: Span | null, column: number, index: number, frame: Frame): Bar | null {
	const centre = frame.xPixels[column]
	if (!span || centre === undefined) return null
	const group = frame.kind === "bars" ? frame.count : 1
	const width = (frame.slot * FILL) / group
	const left = centre - (frame.slot * FILL) / 2 + (frame.kind === "bars" ? index * width : 0)
	const top = frame.scaleY(span.hi)
	return { x: left, y: top, width, height: Math.max(frame.scaleY(span.lo) - top, 0) }
}
