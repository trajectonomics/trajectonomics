import { BASELINE_WIDTH, CHART_BASELINE, CHART_LEFT, CHART_RIGHT } from "./chart-layout"
import { CONTENT_RIGHT } from "./layout"

/** The home card's mascot: the committed cut-out's own pixel size, and the PNG data URI that draws it. */
export interface ShareMascot {
	/** The image's own width, in pixels, read from its PNG header. */
	readonly width: number
	/** The image's own height, in pixels, read from its PNG header. */
	readonly height: number
	/** The `data:image/png;base64,...` URI the card's `<image>` draws. */
	readonly href: string
}

/** The tallest the mascot is drawn, in pixels, when the space beside the chart allows it. */
export const MASCOT_HEIGHT = 290

/** The clear space between the chart's right edge and the mascot's left edge, in pixels. */
export const MASCOT_GAP = 24

/** The right edge the mascot's feet stand against: the margin mirrored on the right. */
export const MASCOT_RIGHT = CONTENT_RIGHT

/** The box the mascot occupies on the card, in pixels. */
export interface MascotPlacement {
	readonly x: number
	readonly y: number
	readonly width: number
	readonly height: number
}

/** A number as the SVG writes it: one decimal, and no trailing zero. */
function tenth(value: number): number {
	return Number(value.toFixed(1))
}

/**
 * The mascot standing on the zero baseline at the right margin, pointing back across the curve: as
 * tall as the space between the chart and the margin allows, so it never covers the curve.
 */
export function mascotPlacement(mascot: ShareMascot): MascotPlacement {
	const widest = MASCOT_RIGHT - CHART_RIGHT - MASCOT_GAP
	const height = tenth(Math.min(MASCOT_HEIGHT, (widest * mascot.height) / mascot.width))
	const width = tenth((height * mascot.width) / mascot.height)
	return Object.freeze({
		x: tenth(MASCOT_RIGHT - width),
		y: tenth(CHART_BASELINE - height),
		width,
		height,
	})
}

/**
 * The zero baseline run out to the margin, and the mascot standing on its right end. It is one
 * picture: the line the curve starts from is the line the mascot's feet stand on.
 */
export function mascotOnBaseline(mascot: ShareMascot, colour: string): string {
	const { x, y, width, height } = mascotPlacement(mascot)
	return [
		`<line x1="${CHART_LEFT}" y1="${CHART_BASELINE}" x2="${CONTENT_RIGHT}" y2="${CHART_BASELINE}" stroke="${colour}" stroke-width="${BASELINE_WIDTH}"/>`,
		`<image href="${mascot.href}" x="${x}" y="${y}" width="${width}" height="${height}"/>`,
	].join("\n")
}
