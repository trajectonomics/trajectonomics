import { areaPath, linePath, type PathPoint } from "../../chart/path"
import { type ChartRow, extentOf, type PlotBox, stopY, xOf, yAt } from "./focus-chart-axis"

export type { ChartRow, PlotBox } from "./focus-chart-axis"

/** The line and the fill under it, one phase of the chart. */
export interface Phase {
	readonly line: string
	readonly area: string
}

/** The rows' points, the stop date's point, and the line's zero, all in the plot's pixels. */
export interface Placement {
	readonly points: readonly PathPoint[]
	readonly stop: PathPoint | null
	readonly zeroY: number
}

/** The rows' points and the stop point, on a date axis that ends at the plan's horizon. */
export function placeRows(
	rows: readonly ChartRow[],
	plot: PlotBox,
	stopDate: string | null,
	endDate: string | null,
): Placement {
	const extent = extentOf(rows)
	const points = rows.map((row) => ({
		x: xOf(row.to, rows, endDate, plot),
		y: yAt(row.y, extent, plot),
	}))
	const zeroY = yAt(0, extent, plot)
	if (stopDate === null || rows.length === 0) return { points, stop: null, zeroY }
	return {
		points,
		stop: { x: xOf(stopDate, rows, endDate, plot), y: stopY(rows, stopDate, extent, plot) },
		zeroY,
	}
}

/** The two phases of the line and the fill under each: everything before the stop, and everything after it. */
export function phasePaths(
	points: readonly PathPoint[],
	stop: PathPoint | null,
	zeroY: number,
): { foreground: Phase; accent: Phase | null } {
	if (stop === null) return { foreground: phaseOf(points, zeroY), accent: null }
	const before = points.filter((point) => point.x < stop.x)
	const after = points.filter((point) => point.x > stop.x)
	return {
		foreground: phaseOf([...before, stop], zeroY),
		accent: phaseOf([stop, ...after], zeroY),
	}
}

function phaseOf(points: readonly PathPoint[], zeroY: number): Phase {
	return { line: linePath(points), area: areaPath(points, zeroY) }
}
