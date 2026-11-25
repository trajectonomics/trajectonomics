import { fitted, type LabelText, stub } from "./label-width"

/** The space kept between two labels on one row, in pixels. */
const GAP_PX = 6
/** How far a label stands off its rule, in pixels, as `LineRules.svelte` draws it. */
const OFFSET_PX = 4

/** One marker as the rules draw it: its x in pixels and its label. */
export interface LabelledMark {
	readonly x: number
	readonly label: string
	/** True when the chart draws the label in monospace, as it does an id no Read names. */
	readonly code?: boolean
}

/** One marker's label, placed: the row it sits on and the words the chart draws for it. */
export interface PlacedLabel {
	readonly row: number
	/** The label, shortened with an ellipsis to fit between the rules, or its first grapheme as a last stub. */
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
 * side it runs towards, so no label crosses a dashed rule. A label with no room on that side moves to the
 * other side of its rule, and one with no room on either keeps a visible stub instead of disappearing.
 * Row 0 is the top. Geometry only: it places text.
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
		// A label with no words at all draws nothing and leaves its row free for one that has some.
		if (text === "") continue
		const free = ends.findIndex((end) => end + GAP_PX <= left)
		const row = free === -1 ? ends.length : free
		ends[row] = right
		placed[index] = { row, text }
	}
	return placed
}

/** One label's box in pixels, and the words that fit in it, on whichever side of its rule has room. */
function place(
	mark: LabelledMark,
	rules: readonly number[],
	width: number,
): readonly [number, number, string] {
	const code = mark.code === true
	const preferred = hangsLeft(mark.x, width)
	const first = fitted(mark.label, room(mark.x, rules, preferred), code)
	if (first.text !== "") return box(mark.x, preferred, first)
	const second = fitted(mark.label, room(mark.x, rules, !preferred), code)
	if (second.text !== "") return box(mark.x, !preferred, second)
	const own = room(mark.x, rules, preferred)
	const other = room(mark.x, rules, !preferred)
	const leftwards = own >= other ? preferred : !preferred
	return box(mark.x, leftwards, stub(mark.label, leftwards ? own : other, code))
}

/** A fitted label's box: its left edge, its right edge, and the words. */
function box(x: number, leftwards: boolean, fitted: LabelText): readonly [number, number, string] {
	return leftwards
		? [x - OFFSET_PX - fitted.width, x - OFFSET_PX, fitted.text]
		: [x + OFFSET_PX, x + OFFSET_PX + fitted.width, fitted.text]
}

/** The room a label at `x` has on one side, up to the nearest rule in that direction. */
function room(x: number, rules: readonly number[], leftwards: boolean): number {
	return leftwards ? x - OFFSET_PX - ruleBefore(rules, x) : ruleAfter(rules, x) - (x + OFFSET_PX)
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
