/** A generous width for one character of a marker label in the chart's small text, in pixels. */
const CHAR_PX = 7
/** The space kept between two labels on one row, in pixels. */
const GAP_PX = 6
/** How far a label stands off its rule, in pixels, as `LineRules.svelte` draws it. */
const OFFSET_PX = 4

/** One marker as the rules draw it: its x in pixels and its label. */
export interface LabelledMark {
	readonly x: number
	readonly label: string
}

/** A label's left and right edges: to the right of its rule, or to the left past the chart's middle. */
function extentOf(mark: LabelledMark, width: number): readonly [number, number] {
	const size = mark.label.length * CHAR_PX
	return mark.x > width / 2
		? [mark.x - OFFSET_PX - size, mark.x - OFFSET_PX]
		: [mark.x + OFFSET_PX, mark.x + OFFSET_PX + size]
}

/**
 * The row each marker's label sits on, so that no two labels overlap. Markers in x order take the first
 * row whose last label ends before theirs starts; row 0 is the top. Geometry only: it places text.
 */
export function labelRows(marks: readonly LabelledMark[], width: number): number[] {
	const ends: number[] = []
	const rows = marks.map(() => 0)
	const order = marks
		.map((_mark, index) => index)
		.sort((a, b) => (marks[a]?.x ?? 0) - (marks[b]?.x ?? 0) || a - b)
	for (const index of order) {
		const mark = marks[index]
		if (mark === undefined) continue
		const [left, right] = extentOf(mark, width)
		const free = ends.findIndex((end) => end + GAP_PX <= left)
		const row = free === -1 ? ends.length : free
		ends[row] = right
		rows[index] = row
	}
	return rows
}
