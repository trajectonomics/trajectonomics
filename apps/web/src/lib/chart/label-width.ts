import { type Grapheme, graphemes } from "./label-graphemes"

/** The width of the ellipsis in the chart's 12px sans-serif text, in pixels. */
const ELLIPSIS_PX = 12
/** The width of the ellipsis in the chart's 11px monospace text, in pixels. */
const CODE_ELLIPSIS_PX = 7

/** Measures text in the page's own font, so a fit uses the face the diagram draws. The estimate when absent. */
export type TextMeasure = (text: string) => number

/** A label's words and the room they take: an estimated width, so a row reserves the label's real box. */
export interface LabelText {
	readonly text: string
	readonly width: number
}

/** The label shortened with an ellipsis to fit `room` pixels; the whole label when it fits, none when even the
 * ellipsis does not. It cuts between graphemes, so a Thai cluster keeps its tone mark and an emoji its pair. */
export function fitted(
	label: string,
	room: number,
	code: boolean,
	measure?: TextMeasure,
): LabelText {
	const parts = graphemes(label, code)
	const whole =
		measure === undefined ? parts.reduce((sum, part) => sum + part.width, 0) : measure(label)
	if (whole <= room) return { text: label, width: whole }
	const ellipsis = ellipsisWidth(code, measure)
	const kept = prefix(parts, room, ellipsis, measure)
	if (kept.text === "") return kept
	return { text: `${kept.text}…`, width: kept.width + ellipsis }
}

/** The label's bare first grapheme, the last thing tried in a crowded place; none when even that does not fit. */
export function stub(label: string, room: number, code: boolean, measure?: TextMeasure): LabelText {
	const [first] = graphemes(label, code)
	const width = first === undefined ? 0 : widthOf(first.text, code, measure)
	return first !== undefined && width <= room ? { text: first.text, width } : { text: "", width: 0 }
}

/** The width of `text` in the chart's text, in pixels: measured when the page can, else its graphemes' widths. */
export function textWidth(text: string, code: boolean, measure?: TextMeasure): number {
	if (measure !== undefined) return measure(text)
	return graphemes(text, code).reduce((sum, part) => sum + part.width, 0)
}

/** The width of the ellipsis the chart draws after a cut label, in the text's own font. */
export function ellipsisWidth(code: boolean, measure?: TextMeasure): number {
	if (measure !== undefined) return measure("…")
	return code ? CODE_ELLIPSIS_PX : ELLIPSIS_PX
}

/** One grapheme's width in the chart's text: measured in the page, or the estimate when there is none. */
export function widthOf(text: string, code: boolean, measure?: TextMeasure): number {
	return measure === undefined ? textWidth(text, code) : measure(text)
}

/** The longest prefix of whole graphemes that fits `room` beside the ellipsis. */
export function prefix(
	parts: readonly Grapheme[],
	room: number,
	ellipsis: number,
	measure?: TextMeasure,
): LabelText {
	if (measure !== undefined) {
		let text = ""
		let kept = ""
		for (const part of parts) {
			const next = `${text}${part.text}`
			const candidate = next.trimEnd()
			if (measure(candidate) + ellipsis > room) break
			text = next
			kept = candidate
		}
		return { text: kept, width: measure(kept) }
	}
	let width = 0
	let kept = 0
	for (const part of parts) {
		if (width + part.width + ellipsis > room) break
		width += part.width
		kept += 1
	}
	return {
		text: parts
			.slice(0, kept)
			.map((part) => part.text)
			.join("")
			.trimEnd(),
		width,
	}
}
