import type { PathPoint } from "../../chart/path"

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

/** A value kept between two bounds. */
export function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high)
}
