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

/** One marker's label, placed: the row it sits on and the words the chart draws for it. */
export interface PlacedLabel {
	readonly row: number
	/** The label, shortened with an ellipsis when a rule leaves no room; empty when it leaves none at all. */
	readonly text: string
}

/**
 * Whether a label stands to the left of its rule: past the chart's middle, so its words run towards the
 * middle rather than off the right edge.
 */
export function hangsLeft(x: number, width: number): boolean {
	return x > width / 2
}

/**
 * The labels of the markers, each placed. Markers in x order take the first row whose last label ends
 * before theirs starts, so no two labels overlap, and a label is shortened to the nearest rule on the
 * side it runs towards, so no label crosses a dashed rule. Row 0 is the top. Geometry only: it places text.
 */
export function placedLabels(marks: readonly LabelledMark[], width: number): PlacedLabel[] {
	const ends: number[] = []
	const placed = marks.map(() => ({ row: 0, text: "" }))
	const rules = marks.map((mark) => mark.x)
	const order = marks
		.map((_mark, index) => index)
		.sort((a, b) => (marks[a]?.x ?? 0) - (marks[b]?.x ?? 0) || a - b)
	for (const index of order) {
		const mark = marks[index]
		if (mark === undefined) continue
		const [left, right, text] = place(mark, rules, width)
		const free = ends.findIndex((end) => end + GAP_PX <= left)
		const row = free === -1 ? ends.length : free
		ends[row] = right
		placed[index] = { row, text }
	}
	return placed
}

/** One label's box in pixels, and the words that fit in it before the rule it runs towards. */
function place(
	mark: LabelledMark,
	rules: readonly number[],
	width: number,
): readonly [number, number, string] {
	const leftwards = hangsLeft(mark.x, width)
	const room = leftwards
		? mark.x - OFFSET_PX - ruleBefore(rules, mark.x)
		: ruleAfter(rules, mark.x) - (mark.x + OFFSET_PX)
	const text = fitted(mark.label, room)
	const size = text.length * CHAR_PX
	return leftwards
		? [mark.x - OFFSET_PX - size, mark.x - OFFSET_PX, text]
		: [mark.x + OFFSET_PX, mark.x + OFFSET_PX + size, text]
}

/** The nearest rule to the left of `x`, or -Infinity when no marker stands there. */
function ruleBefore(rules: readonly number[], x: number): number {
	let nearest = -Infinity
	for (const rule of rules) if (rule < x && rule > nearest) nearest = rule
	return nearest
}

/** The nearest rule to the right of `x`, or Infinity when no marker stands there. */
function ruleAfter(rules: readonly number[], x: number): number {
	let nearest = Infinity
	for (const rule of rules) if (rule > x && rule < nearest) nearest = rule
	return nearest
}

/** The label shortened with an ellipsis to fit `room` pixels; the whole label when it fits. */
function fitted(label: string, room: number): string {
	const fits = Math.floor(room / CHAR_PX)
	if (label.length <= fits) return label
	// A rule's `<title>` still names its marker, so a label with no room for a word and an ellipsis is left out.
	return fits <= 1 ? "" : `${label.slice(0, fits - 1).trimEnd()}…`
}
