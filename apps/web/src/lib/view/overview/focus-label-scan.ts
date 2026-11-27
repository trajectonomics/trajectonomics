import type { PathPoint } from "../../chart/path"
import type { PlotBox } from "./focus-chart-axis"
import { clamp, curveYsIn } from "./focus-label-curve"

/** The label's measured box, in chart units (the SVG draws one unit per pixel). */
export interface LabelBox {
	readonly width: number
	readonly height: number
}

/** A box's top-left, and whether it sits in the band above the plot. */
export interface BoxPlacement {
	readonly x: number
	readonly y: number
	readonly band: boolean
}

/** The space between the line and the box, and between the box and its point. */
export const GAP = 8

/** The space above a box that sits in the band above the plot. */
export const BAND_PAD = 4

/** How finely the scan steps across the plot: the plot's width in at most this many steps. */
const STEPS = 40

/** The curve's span is widened by this much, so the box clears the line's stroke at its edges. */
const PAD = 4

/**
 * The first box beside the preferred left edge that clears the line, scanning outward from it and
 * alternating sides, in steps of at most 1/40 of the plot's width. A box that clears nothing is null.
 */
export function scanBox(
	points: readonly PathPoint[],
	plot: PlotBox,
	preferred: number,
	box: LabelBox,
): BoxPlacement | null {
	const maxX = Math.max(plot.left, plot.right - box.width)
	const start = clamp(preferred, plot.left, maxX)
	const step = Math.max((plot.right - plot.left) / STEPS, 1)
	for (let away = 0; away <= STEPS; away++) {
		for (const offset of offsetsAt(away, step)) {
			const x = clamp(start + offset, plot.left, maxX)
			const y = fitAt(points, plot, x, box)
			if (y !== null) return { x, y, band: false }
		}
	}
	return null
}

/** The preferred distance, then the same distance to the right and to the left. */
function offsetsAt(away: number, step: number): readonly number[] {
	return away === 0 ? [0] : [away * step, -away * step]
}

/** The box's top edge when it clears the line at this x, above the curve when it can, else below it. */
function fitAt(
	points: readonly PathPoint[],
	plot: PlotBox,
	x: number,
	box: LabelBox,
): number | null {
	const ys = curveYsIn(points, x - PAD, x + box.width + PAD)
	if (ys.length === 0) return plot.top
	const above = Math.min(...ys) - GAP - box.height
	if (above >= plot.top) return above
	const below = Math.max(...ys) + GAP
	return below + box.height <= plot.bottom ? below : null
}
