import type { FlowBand, FlowNode } from "./flow-types"
import { toChartNumber } from "./number"

/**
 * The geometry helpers of the flow diagram: stacking a column, spacing its labels, and the closed path of
 * a band. Pure: numbers in, numbers and path strings out. `flow.ts` assembles them into a layout.
 */

/** The space above and below the diagram, so a label at the edge of a band is not cut off. */
export const FLOW_MARGIN = 8
/** The least height of a band whose amount is not zero, so a thin band stays visible. Its label keeps the true amount. */
export const FLOW_MIN_HEIGHT = 3
/** The least distance between two labels in one column, so their text does not overlap. */
export const LABEL_SPACING = 14

/** A band placed in its column: its top and height. */
export interface Placed<T> {
	readonly band: T
	readonly y: number
	readonly height: number
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

/** Stacks a column from the top: each band's height is its share of the scale, lifted to the minimum. */
export function place<T extends { readonly value: number }>(
	bands: readonly T[],
	scale: number,
): { placed: Placed<T>[]; extent: number } {
	let y = FLOW_MARGIN
	const placed = bands.map((band): Placed<T> => {
		const height = Math.max(FLOW_MIN_HEIGHT, band.value * scale)
		const entry = { band, y, height }
		y += height
		return entry
	})
	return { placed, extent: y - FLOW_MARGIN }
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

/** One closed path from a band on the left to a band on the right: its top and bottom edges, as cubic curves. */
export function ribbon(
	x1: number,
	top1: number,
	bottom1: number,
	x2: number,
	top2: number,
	bottom2: number,
): string {
	const mid = (x1 + x2) / 2
	const p = (n: number) => String(round(n))
	return [
		`M${p(x1)},${p(top1)}`,
		`C${p(mid)},${p(top1)} ${p(mid)},${p(top2)} ${p(x2)},${p(top2)}`,
		`L${p(x2)},${p(bottom2)}`,
		`C${p(mid)},${p(bottom2)} ${p(mid)},${p(bottom1)} ${p(x1)},${p(bottom1)}`,
		"Z",
	].join(" ")
}

/** A band with its magnitude in chart units. */
export type Sized = FlowBand & { readonly value: number }

/** Each band's top and bottom edge at the cash node, stacked in order from the node's top. */
export function cashEnds(
	column: readonly Placed<Sized>[],
): { entry: Placed<Sized>; top: number; bottom: number }[] {
	let cursor = FLOW_MARGIN
	return column.map((entry) => {
		const top = cursor
		cursor += entry.height
		return { entry, top, bottom: cursor }
	})
}

/** The nodes of one column, with their labels spread so they do not overlap. */
export function nodesOf(
	column: readonly Placed<Sized>[],
	side: "source" | "use",
	x: number,
	labelX: number,
	anchor: "start" | "end",
): FlowNode[] {
	const labelYs = spreadLabels(column.map((entry) => entry.y + entry.height / 2))
	return column.map((entry, index) => ({
		key: entry.band.key,
		kind: entry.band.kind,
		label: entry.band.label,
		amount: entry.band.amount,
		side,
		x: round(x),
		y: round(entry.y),
		height: round(entry.height),
		labelX: round(labelX),
		labelY: round(labelYs[index] ?? entry.y),
		anchor,
	}))
}
