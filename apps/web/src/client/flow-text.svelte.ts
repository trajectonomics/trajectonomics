import { type TextMeasure, textWidth } from "../lib/chart/label-width"

/** The most widths kept, by string, so a page left open does not grow without limit. */
const MAX_MEASURED = 2000

/** The hidden `<text>` a diagram measures its labels with: it draws nothing and says nothing. */
const PROBE = "[data-flow-probe]"

/** Widths already measured, in the drawing's units, so a re-render does not measure the same words again. */
const measured = new Map<string, number>()

/** Diagrams whose probe and size are watched, so a resize or a font change bumps `stroke` once each. */
const watched = new WeakSet<Element>()

/** Counts the changes the drawing cannot state, such as a larger browser font, so each measure re-runs. */
let stroke = $state(0)

/** Forgets the widths measured in the old font, so every name is fitted again at the size it now draws. */
function changed(): void {
	measured.clear()
	stroke += 1
}

/**
 * Watches the drawing's font and whether it is drawn: a hidden `1em` box grows when the root font does,
 * and the `<svg>` itself gains a size when a breakpoint shows it. Either change re-measures every name.
 */
function watch(svg: SVGSVGElement): void {
	if (watched.has(svg) || typeof ResizeObserver === "undefined") return
	watched.add(svg)
	const box = document.createElementNS("http://www.w3.org/2000/svg", "rect")
	box.setAttribute("width", "1em")
	box.setAttribute("height", "1em")
	box.setAttribute("visibility", "hidden")
	svg.append(box)
	const observer = new ResizeObserver(changed)
	observer.observe(box)
	observer.observe(svg)
}

/**
 * A measure of the diagram's text for one render. Each string is drawn by the diagram's own hidden probe
 * and its width read with `getComputedTextLength`, in the drawing's units, so the fit is the size the SVG
 * draws, including a browser minimum font. It is cached per string until the font or the drawing changes,
 * and re-measured when either does. A page without a drawn probe (server-rendered, or the diagram hidden
 * at this breakpoint) gets the grapheme estimate, the width a server draws by.
 */
export function flowMeasure(diagram: Element | null = null): TextMeasure {
	const estimate = (text: string): number => textWidth(text, false)
	if (typeof document === "undefined" || !(diagram instanceof SVGSVGElement)) return estimate
	watch(diagram)
	void stroke
	const probe = diagram.querySelector<SVGTextElement>(PROBE)
	if (probe === null || diagram.getBoundingClientRect().width === 0) return estimate
	return (text) => {
		const cached = measured.get(text)
		if (cached !== undefined) return cached
		probe.textContent = text
		const width = probe.getComputedTextLength()
		if (width === 0) return estimate(text)
		if (measured.size >= MAX_MEASURED) measured.clear()
		measured.set(text, width)
		return width
	}
}
