import { fitted, type LabelText, stub } from "./label-width"

/** The space kept between two labels on one row, in pixels. */
const GAP_PX = 6
/** How far a label stands off its rule, in pixels. */
export const LABEL_OFFSET_PX = 4

/** One marker as the rules draw it: its x in pixels and its label. */
export interface LabelledMark {
	readonly x: number
	readonly label: string
	/** True when the chart draws the label in monospace, as it does an id no Read names. */
	readonly code?: boolean
}

/** The chart a label is placed in: its whole width, and the x its plot starts and ends at. */
export interface LabelArea {
	readonly width: number
	readonly left: number
	readonly right: number
}

/** One marker's label, placed: its row, the side of its rule it stands on, and the words drawn for it. */
export interface PlacedLabel {
	readonly row: number
	/** True when the label stands to the left of its rule, so its words end there. */
	readonly leftwards: boolean
	/** The label, whole or shortened. Empty when there is no room for it, and then nothing is drawn. */
	readonly text: string
}

/**
 * The labels of the markers, each placed. A label is tried whole on its preferred side of its rule, then
 * whole on the other side, then shortened towards the nearest rule or plot edge on whichever side has
 * more room, so none crosses a dashed rule or leaves the plot. It is left out when neither side holds
 * even its first letter. Markers in x order take the first row whose last label ends before theirs
 * starts, so no two labels overlap. Row 0 is the top. Geometry only: it places text.
 */
export function placedLabels(marks: readonly LabelledMark[], area: LabelArea): PlacedLabel[] {
	const ends: number[] = []
	const placed = marks.map(() => ({ row: 0, leftwards: false, text: "" }))
	const rules = marks.map((mark) => mark.x)
	const order = [...marks.entries()].sort(([a, first], [b, second]) => first.x - second.x || a - b)
	for (const [index, mark] of order) {
		const found = place(mark, rules, area)
		// A label that is not drawn takes no row.
		if (found === undefined) continue
		const { leftwards, text, width } = found
		const left = leftwards ? mark.x - LABEL_OFFSET_PX - width : mark.x + LABEL_OFFSET_PX
		const free = ends.findIndex((end) => end + GAP_PX <= left)
		const row = free === -1 ? ends.length : free
		ends[row] = left + width
		placed[index] = { row, leftwards, text }
	}
	return placed
}

/**
 * The words of one label and the side they go on: the whole label on its preferred side, else whole on the
 * other side, else shortened with an ellipsis on whichever side has more room, else the bare first letter.
 * A label past the chart's middle prefers the left, so its words run towards the middle. Undefined when
 * neither side holds anything.
 */
function place(
	mark: LabelledMark,
	rules: readonly number[],
	area: LabelArea,
): (LabelText & { readonly leftwards: boolean }) | undefined {
	const preferred = mark.x > area.width / 2
	const code = mark.code === true
	const sides = [
		{ leftwards: preferred, space: room(mark.x, rules, area, preferred) },
		{ leftwards: !preferred, space: room(mark.x, rules, area, !preferred) },
	] as const
	for (const side of sides) {
		const words = fitted(mark.label, side.space, code)
		if (words.text !== "" && words.text === mark.label) {
			return { ...words, leftwards: side.leftwards }
		}
	}
	const roomier = sides[1].space > sides[0].space ? sides[1] : sides[0]
	const shorter = fitted(mark.label, roomier.space, code)
	if (shorter.text !== "") return { ...shorter, leftwards: roomier.leftwards }
	for (const side of sides) {
		const words = stub(mark.label, side.space, code)
		if (words.text !== "") return { ...words, leftwards: side.leftwards }
	}
	return undefined
}

/** The room a label at `x` has on one side: up to the nearest rule that way, and never past the plot's edge. */
function room(x: number, rules: readonly number[], area: LabelArea, leftwards: boolean): number {
	if (leftwards) {
		return x - LABEL_OFFSET_PX - Math.max(area.left, ...rules.filter((rule) => rule < x))
	}
	return Math.min(area.right, ...rules.filter((rule) => rule > x)) - (x + LABEL_OFFSET_PX)
}
