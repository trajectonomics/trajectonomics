import type { LineLayout, Mark, Plot } from "./layout-types"
import type { LineSeries } from "./line"

/** A series' short name placed at the end of its line, so the chart needs no legend. */
export interface EndLabel {
	readonly index: number
	readonly text: string
	readonly x: number
	readonly y: number
	readonly anchor: "end"
}

/** How far above the higher end and below the lower one a label stands, in pixels. */
const ABOVE = 6
const BELOW = 14
/** The least room a label keeps from a plot edge, in pixels. */
const EDGE = 14
/** The least distance between the two end points for two labels to sit apart, in pixels. */
const APART = 4

/**
 * The two series' short names, placed at their lines' ends: the higher line's name above it and the lower
 * line's below, both ending at the last point's x. Null when the chart keeps its legend instead: anything
 * but two series, a series with no `short` or no point, ends closer than {@link APART}, or a label with
 * less than {@link EDGE} room from the plot's top or bottom.
 */
export function endLabels(
	layout: LineLayout,
	series: readonly LineSeries[],
	plot: Plot,
): EndLabel[] | null {
	const [first, second] = series
	if (series.length !== 2 || first?.short === undefined || second?.short === undefined) return null
	const firstMark = lastMark(layout, 0)
	const secondMark = lastMark(layout, 1)
	if (firstMark === undefined || secondMark === undefined) return null
	if (Math.abs(firstMark.y - secondMark.y) < APART) return null
	const ends = [
		{ index: 0, text: first.short, mark: firstMark },
		{ index: 1, text: second.short, mark: secondMark },
	] as const
	const higher = ends[0].mark.y <= ends[1].mark.y ? ends[0] : ends[1]
	const lower = higher === ends[0] ? ends[1] : ends[0]
	const labels: EndLabel[] = [
		{
			index: higher.index,
			text: higher.text,
			x: higher.mark.x,
			y: higher.mark.y - ABOVE,
			anchor: "end",
		},
		{
			index: lower.index,
			text: lower.text,
			x: lower.mark.x,
			y: lower.mark.y + BELOW,
			anchor: "end",
		},
	]
	const top = plot.margin.top
	const bottom = plot.height - plot.margin.bottom
	const roomy = labels.every((one) => one.y - top >= EDGE && bottom - one.y >= EDGE)
	return roomy ? labels : null
}

/** The last mark a series has, so its name stands beside the line's end rather than a later gap. */
function lastMark(layout: LineLayout, index: number): Mark | undefined {
	const marks = layout.series[index]?.marks ?? []
	for (let position = marks.length - 1; position >= 0; position -= 1) {
		const mark = marks[position]
		if (mark) return mark
	}
	return undefined
}
