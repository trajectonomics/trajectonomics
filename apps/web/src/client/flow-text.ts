import { type TextMeasure, textWidth } from "../lib/chart/label-width"

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

/** The font the diagram draws its labels in, read from its text's computed style, so a larger root is measured as drawn. */
function labelFont(diagram: Element | null): string | null {
	if (diagram === null) return null
	const text = diagram.querySelector("text") ?? diagram
	const style = getComputedStyle(text)
	const family = style.fontFamily
	return family === "" ? null : `${style.fontSize} ${family}`
}

/**
 * A measure of the diagram's text for one render: it reads the drawing's font once, then measures each
 * string once per font, so a page at a larger browser font is fitted at the size it draws. A page that
 * cannot measure (no document, no canvas, no diagram yet) gets the grapheme estimate, the width a server
 * draws by.
 */
export function flowMeasure(diagram: Element | null = null): TextMeasure {
	const canvas = measuring()
	const font = canvas === null ? null : labelFont(diagram)
	if (canvas === null || font === null) return (text) => textWidth(text, false)
	return (text) => {
		const key = `${font}\u0000${text}`
		const cached = measured.get(key)
		if (cached !== undefined) return cached
		canvas.font = font
		const width = canvas.measureText(text).width
		if (measured.size >= MAX_MEASURED) measured.clear()
		measured.set(key, width)
		return width
	}
}
