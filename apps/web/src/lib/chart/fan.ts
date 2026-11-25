import type { LineLayout, Mark } from "./line-layout"
import { bandPath, linePath, type PathPoint } from "./path"

/** The percentile levels a fan draws, from the engine's fixed set. */
export const FAN_LEVELS = [10, 25, 50, 75, 90] as const

/** The name of the series a percentile level is drawn as, in a fan's layout. */
export function fanSeriesName(level: number): string {
	return `P${level}`
}

/** A fan chart as SVG paths: the 10–90 band, the 25–75 band and the median line, all in pixels. */
export interface Fan {
	readonly outer: string
	readonly inner: string
	readonly median: string
}

/** The marks of the series drawn for one percentile level, without the gaps, or null when it is absent. */
function marksAt(layout: LineLayout, level: number): PathPoint[] | null {
	const series = layout.series.find((line) => line.name === fanSeriesName(level))
	if (series === undefined) return null
	return series.marks.filter((mark): mark is Mark => mark !== null)
}

/**
 * The fan a line layout draws, from the series named for the 10th, 25th, 50th, 75th and 90th
 * Percentiles. Null when the layout lacks one of them, so the chart shows no fan rather than a partial one.
 */
export function fanOf(layout: LineLayout): Fan | null {
	const p10 = marksAt(layout, 10)
	const p25 = marksAt(layout, 25)
	const p50 = marksAt(layout, 50)
	const p75 = marksAt(layout, 75)
	const p90 = marksAt(layout, 90)
	if (!p10 || !p25 || !p50 || !p75 || !p90) return null
	return { outer: bandPath(p90, p10), inner: bandPath(p75, p25), median: linePath(p50) }
}
