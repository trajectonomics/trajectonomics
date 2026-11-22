/** A point in pixels. */
export interface PathPoint {
	readonly x: number
	readonly y: number
}

function pixel(value: number): string {
	return String(Number(value.toFixed(2)))
}

/** An SVG path through the points in order: a move to the first, then a line to each next. */
export function linePath(points: readonly PathPoint[]): string {
	return points
		.map((point, index) => `${index === 0 ? "M" : "L"}${pixel(point.x)} ${pixel(point.y)}`)
		.join(" ")
}

/** The line path closed down to a baseline, for filling the area under a series. */
export function areaPath(points: readonly PathPoint[], baseline: number): string {
	const first = points[0]
	const last = points[points.length - 1]
	if (!first || !last) return ""
	const base = pixel(baseline)
	return `${linePath(points)} L${pixel(last.x)} ${base} L${pixel(first.x)} ${base} Z`
}
