import type { PathPoint } from "../../chart/path"
import type { PlotBox } from "./focus-chart-axis"

/** Where the answer box sits relative to its point: to the right, to the left, or centred on it. */
export type LabelSide = "left" | "right" | "center"

/** The label's measured box, in chart units (the SVG draws one unit per pixel). */
export interface LabelBox {
	readonly width: number
	readonly height: number
}

export interface LabelPlacement {
	/** The box's left edge. */
	readonly x: number
	/** The box's top edge. */
	readonly y: number
	readonly side: LabelSide
}

/** The space between the line and the box, and between the box and its point. */
const GAP = 8

/** The answer's box, above the highest curve point within its span; below the lowest when there is no room. */
export function placeLabel(
	points: readonly PathPoint[],
	plot: PlotBox,
	anchor: PathPoint,
	box: LabelBox,
	side: LabelSide,
): LabelPlacement {
	const beside =
		side === "left"
			? anchor.x - GAP - box.width
			: side === "center"
				? anchor.x - box.width / 2
				: anchor.x + GAP
	const x = clamp(beside, plot.left, Math.max(plot.left, plot.right - box.width))
	if (curveYsIn(points, x, x + box.width).length === 0) {
		const y = clamp(anchor.y - GAP - box.height, plot.top, plot.bottom - box.height)
		return { x, y, side }
	}
	return { ...placeBox(points, plot, beside, box), side }
}

/**
 * The top-left of a box of this size, so the whole box sits above the highest curve point within its x
 * span. When the plot has no room above the curve, the box goes below the curve's lowest point in the
 * span, and it never leaves the plot.
 */
export function placeBox(
	points: readonly PathPoint[],
	plot: PlotBox,
	left: number,
	box: LabelBox,
): { x: number; y: number } {
	const x = clamp(left, plot.left, Math.max(plot.left, plot.right - box.width))
	const ys = curveYsIn(points, x, x + box.width)
	if (ys.length === 0) return { x, y: plot.top }
	const above = Math.min(...ys) - GAP - box.height
	if (above >= plot.top) return { x, y: above }
	const below = Math.max(...ys) + GAP
	if (below + box.height <= plot.bottom) return { x, y: below }
	return { x, y: Math.max(plot.top, Math.min(below, plot.bottom - box.height)) }
}

/**
 * The curve's heights at every point of a horizontal span: each segment's end inside the span and the
 * interpolated height where the span cuts it. A polyline's highest and lowest points in a span are among them.
 */
export function curveYsIn(points: readonly PathPoint[], from: number, to: number): number[] {
	const ys: number[] = []
	for (let index = 0; index < points.length - 1; index++) {
		const start = points[index]
		const end = points[index + 1]
		if (start === undefined || end === undefined) continue
		if (end.x < from || start.x > to) continue
		const low = Math.max(from, start.x)
		const high = Math.min(to, end.x)
		ys.push(yAtX(start, end, low), yAtX(start, end, high))
	}
	const only = points[0]
	if (points.length === 1 && only !== undefined && only.x >= from && only.x <= to) ys.push(only.y)
	return ys
}

/** A segment's height at an x between its ends. */
function yAtX(start: PathPoint, end: PathPoint, x: number): number {
	const span = end.x - start.x
	return span === 0 ? start.y : start.y + ((end.y - start.y) * (x - start.x)) / span
}

function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high)
}
