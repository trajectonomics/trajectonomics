import type { PathPoint } from "../../chart/path"
import type { PlotBox } from "./focus-chart-axis"
import { clamp } from "./focus-label-curve"
import { BAND_PAD, type BoxPlacement, GAP, type LabelBox, scanBox } from "./focus-label-scan"

export { curveYsIn } from "./focus-label-curve"
export type { BoxPlacement, LabelBox } from "./focus-label-scan"

/** Where the answer box sits relative to its point: to the right, to the left, or centred on it. */
export type LabelSide = "left" | "right" | "center"

/** The year beside a reachable chart's flag, at 13px, as the layout measures it. */
export const FLAG_YEAR: LabelBox = { width: 34, height: 16 }

export interface LabelPlacement {
	/** The box's left edge. */
	readonly x: number
	/** The box's top edge. */
	readonly y: number
	readonly side: LabelSide
	/** True when no place in the plot clears the line, and the box sits in the band above it. */
	readonly band: boolean
}

/** The height the chart reserves above its plot for a box that sits in the band. */
export function bandHeight(box: LabelBox): number {
	return box.height + 2 * BAND_PAD
}

/**
 * The answer's box beside its point, in the first place that clears the line. A box that clears the
 * line nowhere in the plot sits in the band above it, and the chart reserves that band's height.
 */
export function placeLabel(
	points: readonly PathPoint[],
	plot: PlotBox,
	anchor: PathPoint,
	box: LabelBox,
	side: LabelSide,
): LabelPlacement {
	const beside =
		side === "left"
			? anchor.x - GAP - box.width
			: side === "center"
				? anchor.x - box.width / 2
				: anchor.x + GAP
	if (points.length === 0) {
		const y = clamp(anchor.y - GAP - box.height, plot.top, plot.bottom - box.height)
		return {
			x: clamp(beside, plot.left, Math.max(plot.left, plot.right - box.width)),
			y,
			side,
			band: false,
		}
	}
	return { ...placeBox(points, plot, beside, box), side }
}

/**
 * The top-left of a box of this size, in the first x that lets the whole box sit above the curve's
 * highest point in its span, or below its lowest. A box that fits nowhere is placed in the band
 * above the plot, and the caller reserves `bandHeight(box)` for it.
 */
export function placeBox(
	points: readonly PathPoint[],
	plot: PlotBox,
	left: number,
	box: LabelBox,
): BoxPlacement {
	const found = scanBox(points, plot, left, box)
	if (found !== null) return found
	const x = clamp(left, plot.left, Math.max(plot.left, plot.right - box.width))
	return { x, y: BAND_PAD, band: true }
}
