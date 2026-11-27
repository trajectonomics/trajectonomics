import { type TextMeasure, textWidth } from "../lib/chart/label-width"

/** The most widths kept, by string, so a page left open does not grow without limit. */
const MAX_MEASURED = 2000

/** Widths already measured, in the drawing's units, so a re-render does not measure the same words again. */
const measured = new Map<string, number>()

/** Counts a change in the drawn text's size, so each diagram fits its names again at the size it now draws. */
let stroke = $state(0)

/**
 * The size the cached widths were measured under, shared by every probe: a new probe's first callback
 * compares the size it draws with it, so widths cached before the font changed on another page are
 * cleared when the diagram comes back.
 */
let seen: { width: number; height: number } | null = null

/** Forgets the widths measured in the old font, so every name is fitted again at the size it now draws. */
function changed(): void {
	measured.clear()
	stroke += 1
}

/**
 * Watches the probe's hidden sample text: its box grows with the drawn font's size and family and with
 * the user's letter and word spacing, so every name is measured again at the size and spacing it now
 * draws. Only a real change of the box's size clears the widths: a year change, a re-render or a resize
 * leaves them be. A new probe's first callback compares the size it draws with the size the widths were
 * measured under, so a font changed on another page clears them. Returns the teardown that disconnects it.
 */
export function observeFlowText(svg: Element): () => void {
	if (typeof ResizeObserver === "undefined") return () => {}
	const box = svg.querySelector("[data-flow-size]") ?? svg
	const observer = new ResizeObserver((entries) => {
		const rect = entries[0]?.contentRect
		if (rect === undefined) return
		const size = { width: rect.width, height: rect.height }
		if (seen !== null && size.width === seen.width && size.height === seen.height) return
		const first = seen === null
		seen = size
		if (!first) changed()
	})
	observer.observe(box)
	return () => observer.disconnect()
}

/**
 * A measure of the diagram's text for one render, through the one probe the page always draws. Each string
 * is written to the probe and its width read with `getComputedTextLength`, in the drawing's units, so the
 * fit is the size the SVG draws, including a browser minimum font and user text spacing. The probe's text
 * is hidden and emptied after each measurement, so a name or an amount it measures never stays in the
 * page. It is cached per string until the drawn font changes. A page without a probe (server-rendered,
 * before hydration) gets the grapheme estimate, the width a server draws by.
 */
export function flowMeasure(probe: SVGTextElement | null = null): TextMeasure {
	const estimate = (text: string): number => textWidth(text, false)
	if (probe === null) return estimate
	void stroke
	return (text) => {
		const cached = measured.get(text)
		if (cached !== undefined) return cached
		probe.textContent = text
		const width = probe.getComputedTextLength()
		probe.textContent = ""
		if (width === 0) return estimate(text)
		if (measured.size >= MAX_MEASURED) measured.clear()
		measured.set(text, width)
		return width
	}
}
