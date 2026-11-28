import type { CompareChartPoint } from "./chart"

/** A place on the focus picture's 0–100 box: x to the right, y down. Placement only, never shown. */
export interface FocusPlace {
	readonly x: number
	readonly y: number
}

/** One line of the Compare page's focus picture: its polyline and its FI dot. */
export interface FocusLine {
	readonly key: "a" | "b"
	readonly name: string
	/** The SVG polyline's `points` attribute. */
	readonly points: string
	/** True for the winner's line, which the picture draws in the accent colour. */
	readonly accent: boolean
	/** The plan's FI date on the annual row that holds it, when the plan reaches one; else null. */
	readonly dot: FocusPlace | null
}

/** What one line needs: its chart points, whether it is the winner's, and the FI date to dot. */
export interface FocusLineSpec {
	readonly key: "a" | "b"
	readonly name: string
	readonly points: readonly CompareChartPoint[]
	readonly accent: boolean
	readonly dotDate: string | null
}

/** One decimal place places a mark, and keeps the polyline short. */
function round(value: number): number {
	return Math.round(value * 10) / 10
}

/** The y of a value in the 0–100 box, over the range of both lines; a flat pair draws across the middle. */
function placeY(value: number, min: number, max: number): number {
	if (max === min) return 50
	return round(100 - ((value - min) / (max - min)) * 100)
}

/**
 * The x of a point on the shared time axis of both lines: the first is 0, the longer line's last is 100, and one
 * point alone sits in the middle. A line that runs out keeps its real years, so it ends short of the edge.
 */
function placeX(index: number, count: number): number {
	if (count < 2) return 50
	return round((index / (count - 1)) * 100)
}

/** The y range of both lines together, so the two draw at one scale. */
function togetherRange(specs: readonly FocusLineSpec[]): { min: number; max: number } | null {
	const values = specs.flatMap((spec) => spec.points.map((point) => point.y))
	if (values.length === 0) return null
	return { min: Math.min(...values), max: Math.max(...values) }
}

/** The index of the annual row whose period holds the date, compared as text, or -1 when none does. */
function rowOf(points: readonly CompareChartPoint[], date: string): number {
	return points.findIndex((point) => point.from <= date && date <= point.to)
}

/** The two lines of the focus picture, placed on one time axis, the winner accented and each FI date dotted. */
export function focusLines(
	specs: readonly [FocusLineSpec, FocusLineSpec],
): readonly [FocusLine, FocusLine] {
	const range = togetherRange(specs)
	const y = (value: number) => (range === null ? 50 : placeY(value, range.min, range.max))
	const maxCount = Math.max(specs[0].points.length, specs[1].points.length)
	const line = (spec: FocusLineSpec): FocusLine => {
		const placed = spec.points.map((point, index) => ({
			x: placeX(index, maxCount),
			y: y(point.y),
		}))
		const at = spec.dotDate === null ? -1 : rowOf(spec.points, spec.dotDate)
		return {
			key: spec.key,
			name: spec.name,
			points: placed.map((point) => `${point.x},${point.y}`).join(" "),
			accent: spec.accent,
			dot: placed[at] ?? null,
		}
	}
	return [line(specs[0]), line(specs[1])]
}
