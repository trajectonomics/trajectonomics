import type { FlowBand, FlowNode } from "./flow-types"
import { toChartNumber } from "./number"

/**
 * The geometry helpers of the flow diagram: stacking a column, centring it on the cash node, spacing its
 * labels, and the closed path of a band. Pure: numbers in, numbers and path strings out. `flow.ts`
 * assembles them into a layout.
 */

/** The space above and below the diagram, so a label at the edge of a band is not cut off. */
export const FLOW_MARGIN = 8
/** The least height of a band whose amount is not zero, so a thin band stays visible. Its label keeps the true amount. */
export const FLOW_MIN_HEIGHT = 3
/** The gap between two bands of one column, so their edges do not run together. */
export const FLOW_BAND_GAP = 4
/** The least distance between two labels in one column, so their text does not overlap. */
export const LABEL_SPACING = 14
/** Half the height of a label's line (12px text on a 16px line), so a label's box is its y plus or minus this. */
export const LABEL_HALF = 8

/** A band the caller states, with its magnitude in chart units. */
export type Sized = FlowBand & { readonly value: number }

/** A band stacked in its column: its top from the cash node's top, and its height. */
export interface Placed {
	readonly band: Sized
	readonly y: number
	readonly height: number
}

/** A band in its column, with the top where its ribbon meets the cash node and the top of its own node. */
export interface Slot {
	readonly band: Sized
	readonly height: number
	readonly top: number
	readonly nodeTop: number
}

/** Rounds a coordinate to two decimals, so the path strings are stable. */
export function round(value: number): number {
	return Math.round(value * 100) / 100
}

/** The bands whose amount is not zero, each with its magnitude. A zero line draws nothing. */
export function sized<T extends { readonly amount: string }>(
	bands: readonly T[],
): (T & { readonly value: number })[] {
	return bands.flatMap((band) => {
		const value = Math.abs(toChartNumber(band.amount))
		return value > 0 ? [{ ...band, value }] : []
	})
}

/** The sum of a column's magnitudes, in chart units. It fixes the scale only; no figure is shown from it. */
export function columnTotal(bands: readonly { readonly value: number }[]): number {
	return bands.reduce((sum, band) => sum + band.value, 0)
}

/**
 * Stacks a column from the top: each band's height is its share of the scale, lifted to the minimum, and
 * a gap separates it from the next. `extent` is the column's height from its first band to its last.
 */
export function place(
	bands: readonly Sized[],
	scale: number,
): { placed: Placed[]; extent: number } {
	let y = FLOW_MARGIN
	const placed = bands.map((band): Placed => {
		const height = Math.max(FLOW_MIN_HEIGHT, band.value * scale)
		const entry = { band, y, height }
		y += height + FLOW_BAND_GAP
		return entry
	})
	const extent = placed.length === 0 ? 0 : y - FLOW_BAND_GAP - FLOW_MARGIN
	return { placed, extent }
}

/**
 * Centres a column on the cash node. The taller column sits at the node's top; a shorter one moves down by
 * half the difference, so its ribbons bend into the node rather than running flat.
 */
export function slotsOf(column: { placed: Placed[]; extent: number }, cashHeight: number): Slot[] {
	const offset = round((cashHeight - column.extent) / 2)
	return column.placed.map((entry) => ({
		band: entry.band,
		height: entry.height,
		top: entry.y,
		nodeTop: round(entry.y + offset),
	}))
}

/** Each label's y, pushed down where it would sit on the one above. */
export function spreadLabels(centers: readonly number[]): number[] {
	const ys: number[] = []
	for (const center of centers) {
		const above = ys.at(-1)
		ys.push(above === undefined ? center : Math.max(center, above + LABEL_SPACING))
	}
	return ys
}

/** The nodes of one column, with their labels spread so they do not overlap. */
export function nodesOf(
	slots: readonly Slot[],
	side: "source" | "use",
	x: number,
	labelX: number,
	anchor: "start" | "end",
): FlowNode[] {
	const labelYs = spreadLabels(slots.map((slot) => slot.nodeTop + slot.height / 2))
	return slots.map((slot, index) => ({
		key: slot.band.key,
		kind: slot.band.kind,
		label: slot.band.label,
		amount: slot.band.amount,
		side,
		x: round(x),
		y: round(slot.nodeTop),
		height: round(slot.height),
		labelX: round(labelX),
		labelY: round(labelYs[index] ?? slot.nodeTop + slot.height / 2),
		anchor,
	}))
}
