import { columnTotal, round, sized } from "./flow-geometry"
import type { FlowInput, FlowKind } from "./flow-types"
import { fitted, type TextMeasure, textWidth } from "./label-width"

/**
 * The flow diagram of one year, for a phone: the sources above and the uses below, two lists of bars on
 * one scale. Pure: bands in, geometry out, with no DOM and no money arithmetic on the figures a person
 * reads. A bar's length is its amount's share of the taller column, so a bar here is as long, in share, as
 * the same band's height in the wide diagram, and the amount becomes a number only in `toChartNumber`, to
 * place a mark. Every band the wide diagram draws is a row here, with its name and amount on a line above
 * its bar, so nothing is cut off and nothing scrolls sideways.
 */

/** The width of the layout, in the units of its viewBox: the width of a 360px phone less the page's gutters. */
export const STACK_WIDTH = 320
/** The space at the left, right, top and bottom of the layout. */
export const STACK_MARGIN = 8
/** The length of a bar that is the whole of the taller column. */
export const STACK_BAR_MAX = STACK_WIDTH - 2 * STACK_MARGIN
/** The least length of a bar whose amount is not zero, so a thin band stays visible. Its label keeps the true amount. */
export const STACK_MIN_BAR = 3
/** The height of a bar. */
export const STACK_BAR_HEIGHT = 10
/** Half the height of a text line (12px text on a 16px line), so a line's box is its y plus or minus this. */
export const STACK_LABEL_HALF = 8
/** The gap from the top of a row to the middle of its text line. */
const LABEL_Y = STACK_LABEL_HALF
/** The top of a row's bar, from the top of the row: below its text line, with a small gap. */
const BAR_Y = 2 * STACK_LABEL_HALF + 2
/** The height of a row, from its text line to the bottom of its bar. */
export const STACK_ROW_HEIGHT = BAR_Y + STACK_BAR_HEIGHT
/** The gap between two rows. */
export const STACK_ROW_GAP = 10
/** The height of a heading line, with the gap under it. */
export const STACK_HEADING_HEIGHT = 2 * STACK_LABEL_HALF + 6
/** The gap between the sources' list and the uses' list. */
export const STACK_SECTION_GAP = 14
/** The gap between a row's name and its amount. */
const NAME_GAP = 8
/** How far a row's name clip reaches past its room on each side, for a glyph that paints past the canvas measure. */
export const STACK_CLIP_SLACK = 2

/** A heading above one list: the words and where its text starts. */
export interface StackHeading {
	readonly side: "source" | "use"
	readonly text: string
	readonly x: number
	readonly y: number
}

/** One band as a row: the name line at `labelY`, the amount at the right, and the bar under them. */
export interface StackRow {
	readonly key: string
	readonly kind: FlowKind
	readonly label: string
	readonly amount: string
	readonly side: "source" | "use"
	/** Where the name starts (left-anchored) and where the amount ends (right-anchored), both on `labelY`. */
	readonly labelX: number
	readonly amountX: number
	readonly labelY: number
	readonly barX: number
	readonly barY: number
	readonly barWidth: number
	readonly barHeight: number
}

/** The geometry of a year's phone layout: its size, its headings and its rows, the sources first. */
export interface StackLayout {
	readonly width: number
	readonly height: number
	readonly headings: readonly StackHeading[]
	readonly rows: readonly StackRow[]
}

const HEADINGS = { source: "Where it comes from", use: "Where it goes" } as const

/**
 * The geometry of one year: a heading, then a row for each source from the top, then a heading and a row for
 * each use. A list with no band draws neither its heading nor a row, a zero band draws nothing, and an
 * empty year is an empty layout. The layout is as tall as its last bar, plus the margin.
 */
export function layoutStack(input: FlowInput): StackLayout {
	const sources = sized(input.sources)
	const uses = sized(input.uses)
	const largest = Math.max(columnTotal(sources), columnTotal(uses))
	const scale = largest > 0 ? STACK_BAR_MAX / largest : 0
	const headings: StackHeading[] = []
	const rows: StackRow[] = []
	let y = STACK_MARGIN
	for (const [side, bands] of [
		["source", sources],
		["use", uses],
	] as const) {
		if (bands.length === 0) continue
		if (headings.length > 0) y += STACK_SECTION_GAP - STACK_ROW_GAP
		headings.push({ side, text: HEADINGS[side], x: STACK_MARGIN, y: round(y + STACK_LABEL_HALF) })
		y += STACK_HEADING_HEIGHT
		for (const band of bands) {
			rows.push({
				key: band.key,
				kind: band.kind,
				label: band.label,
				amount: band.amount,
				side,
				labelX: STACK_MARGIN,
				amountX: STACK_WIDTH - STACK_MARGIN,
				labelY: round(y + LABEL_Y),
				barX: STACK_MARGIN,
				barY: round(y + BAR_Y),
				barWidth: round(Math.max(STACK_MIN_BAR, band.value * scale)),
				barHeight: STACK_BAR_HEIGHT,
			})
			y += STACK_ROW_HEIGHT + STACK_ROW_GAP
		}
	}
	const bottom = rows.length === 0 ? 0 : y - STACK_ROW_GAP
	return { width: STACK_WIDTH, height: round(bottom + STACK_MARGIN), headings, rows }
}

/** A row's name as drawn: the words in its room, and that room, which its clip holds. */
export interface StackName {
	readonly text: string
	readonly room: number
}

/**
 * A row's name as it is drawn. The name is shortened with an ellipsis so that it and the amount fit the
 * line, measured in the page's font when `measure` is given and in a conservative estimate when not. The
 * amount is as the page shows it and is never shortened: the name gives way first, losing its end
 * between graphemes, so it never covers the amount or leaves the line. The full name stays in the band's
 * `aria-label` and the table.
 */
export function stackName(label: string, shownAmount: string, measure?: TextMeasure): StackName {
	const amount = measure === undefined ? textWidth(shownAmount, false) : measure(shownAmount)
	const room = Math.max(0, STACK_WIDTH - 2 * STACK_MARGIN - NAME_GAP - amount)
	return { text: fitted(label, room, false, measure).text, room }
}
