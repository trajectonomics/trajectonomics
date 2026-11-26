import { type TextMeasure, textWidth } from "../lib/chart/label-width"

/** The size of the diagram's label text: `text-[12px]` on the drawing, in pixels. */
const SIZE_PX = 12

/** The most widths kept, by font and string, so a page left open does not grow without limit. */
const MAX_MEASURED = 2000

/** Widths already measured, by font and string, so a re-render does not measure the same words again. */
const measured = new Map<string, number>()

let context: CanvasRenderingContext2D | null | undefined

/** The canvas that measures the page's text, or null when this page cannot measure it. */
function measuring(): CanvasRenderingContext2D | null {
	if (context === undefined) {
		context =
			typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d")
	}
	return context
}

/** The font the diagram draws its labels in, read from the page so a pinned test font is the one measured. */
function labelFont(): string | null {
	if (typeof document === "undefined" || document.body === null) return null
	const family = getComputedStyle(document.body).fontFamily
	return family === "" ? null : `${SIZE_PX}px ${family}`
}

/**
 * A measure of the diagram's text for one render: it reads the page's font once, then measures each string
 * once per font. A page that cannot measure (no document, no canvas) gets the grapheme estimate, the same
 * width a server draws by.
 */
export function flowMeasure(): TextMeasure {
	const canvas = measuring()
	const font = labelFont()
	if (canvas === null || font === null) return (text) => textWidth(text, false)
	canvas.font = font
	return (text) => {
		const key = `${font}\u0000${text}`
		const cached = measured.get(key)
		if (cached !== undefined) return cached
		const width = canvas.measureText(text).width
		if (measured.size >= MAX_MEASURED) measured.clear()
		measured.set(key, width)
		return width
	}
}
