import {
	CHART_BASELINE,
	CHART_HEIGHT,
	CHART_LEFT,
	CHART_RIGHT,
	CURVE_SAMPLES,
	CURVE_WIDTH,
	KNEE_FRACTION,
	netWorthShape,
} from "./chart-layout"

/** One point of the curve, in pixels, rounded to the tenth a picture can show. */
export interface ChartPoint {
	readonly x: number
	readonly y: number
}

/** A number as the SVG writes it: one decimal, and no trailing zero. */
function tenth(value: number): number {
	return Number(value.toFixed(1))
}

/** The pixel the curve sits at, `u` of the way along the time axis. */
export function pointAt(u: number): ChartPoint {
	return Object.freeze({
		x: tenth(CHART_LEFT + (CHART_RIGHT - CHART_LEFT) * u),
		y: tenth(CHART_BASELINE - netWorthShape(u) * CHART_HEIGHT),
	})
}

/** The `d` attribute that draws a run of points as one polyline. */
function pathData(points: readonly ChartPoint[]): string {
	return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ")
}

/** The two runs the curve is stroked as, and the soft area under the free one, as SVG data. */
export interface CurveSegments {
	readonly working: readonly ChartPoint[]
	readonly free: readonly ChartPoint[]
	readonly area: string
}

/** The curve split at the knee: grey while working, accent once free, and the area under it. */
export function curveSegments(): CurveSegments {
	const step = 1 / (CURVE_SAMPLES - 1)
	const knee = pointAt(KNEE_FRACTION)
	const even = Array.from({ length: CURVE_SAMPLES }, (_, index) => pointAt(index * step))
	const points = [...even, knee].sort((left, right) => left.x - right.x)
	const free = points.filter((point) => point.x >= knee.x)
	const last = points[points.length - 1] ?? knee
	return Object.freeze({
		working: Object.freeze(points.filter((point) => point.x <= knee.x)),
		free: Object.freeze(free),
		area: `${pathData(free)} L${last.x} ${CHART_BASELINE} L${knee.x} ${CHART_BASELINE} Z`,
	})
}

/** One path of the net-worth curve, in its own colour, with round ends. */
export function curveMarkup(points: readonly ChartPoint[], colour: string): string {
	return `<path d="${pathData(points)}" fill="none" stroke="${colour}" stroke-width="${CURVE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`
}
