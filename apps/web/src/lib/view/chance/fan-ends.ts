import { type FanLabelEnd, fanLabels, fanSeriesName, type LineLayout } from "../../chart"

/** The last mark's y of one percentile's series, where its label sits, or null when it is not drawn. */
function endY(at: LineLayout, level: number): number | null {
	const line = at.series.find((one) => one.name === fanSeriesName(level))
	return line?.marks.filter((mark) => mark !== null).at(-1)?.y ?? null
}

/**
 * The labels a fan draws at its right edge, the median first and then the band edges: a level the layout
 * does not draw is left out, and so is one whose end sits too near a label already kept.
 */
export function fanEnds(at: LineLayout): FanLabelEnd[] {
	const levels = [
		{ text: "50th", level: 50 },
		{ text: "90th", level: 90 },
		{ text: "10th", level: 10 },
	]
	const ends = levels.flatMap(({ text, level }) => {
		const y = endY(at, level)
		return y === null ? [] : [{ text, y }]
	})
	return fanLabels(ends)
}
