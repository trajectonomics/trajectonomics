import { type Grapheme, graphemes } from "./label-graphemes"

/** The width of the ellipsis in the chart's 12px sans-serif text, in pixels. */
const ELLIPSIS_PX = 12
/** The width of the ellipsis in the chart's 11px monospace text, in pixels. */
const CODE_ELLIPSIS_PX = 7

/** A label's words and the room they take: an estimated width, so a row reserves the label's real box. */
export interface LabelText {
	readonly text: string
	readonly width: number
}

/** The label shortened with an ellipsis to fit `room` pixels; the whole label when it fits, none when even the
 * ellipsis does not. It cuts between graphemes, so a Thai cluster keeps its tone mark and an emoji its pair. */
export function fitted(label: string, room: number, code: boolean): LabelText {
	const parts = graphemes(label, code)
	const whole = parts.reduce((sum, part) => sum + part.width, 0)
	if (whole <= room) return { text: label, width: whole }
	const ellipsis = code ? CODE_ELLIPSIS_PX : ELLIPSIS_PX
	const kept = prefix(parts, room, ellipsis)
	if (kept.text === "") return kept
	return { text: `${kept.text}…`, width: kept.width + ellipsis }
}

/** The label's bare first grapheme, the last thing tried in a crowded place; none when even that does not fit. */
export function stub(label: string, room: number, code: boolean): LabelText {
	const [first] = graphemes(label, code)
	return first !== undefined && first.width <= room ? first : { text: "", width: 0 }
}

/** The estimated width of `text` in the chart's text, in pixels: the sum of its graphemes' widths. */
export function textWidth(text: string, code: boolean): number {
	return graphemes(text, code).reduce((sum, part) => sum + part.width, 0)
}

/** The words before a twin label's `(id)` suffix, and the suffix itself. */
interface Twin {
	readonly stem: string
	readonly suffix: string
}

/** A label that ends with a twin's `(id)`, split before the suffix; null for a label without one. */
function twinOf(label: string): Twin | null {
	const match = /^(.*?)\s*\(([^()]*)\)$/u.exec(label)
	if (match === null) return null
	const stem = (match[1] ?? "").trimEnd()
	const id = (match[2] ?? "").trim()
	return stem === "" || id === "" ? null : { stem, suffix: `(${id})` }
}

/**
 * The label shortened to `room` with a twin's `(id)` suffix kept in view: "Salary and rent from…(salary)".
 * The suffix gives way only when it and the ellipsis alone cannot fit, and then the label is cut normally.
 */
export function fittedKeepingSuffix(label: string, room: number, code: boolean): LabelText {
	const twin = twinOf(label)
	if (twin === null) return fitted(label, room, code)
	const suffixWidth = textWidth(twin.suffix, code)
	const stem = fitted(twin.stem, room - suffixWidth, code)
	if (stem.text === "") return fitted(label, room, code)
	if (stem.text === twin.stem) {
		const whole = fitted(label, room, code)
		if (whole.text === label) return whole
		// A whole stem can still lose the space before its suffix, so glue the suffix on rather than cut it.
		return { text: `${twin.stem}${twin.suffix}`, width: stem.width + suffixWidth }
	}
	return { text: `${stem.text}${twin.suffix}`, width: stem.width + suffixWidth }
}

/** The longest prefix of whole graphemes that fits `room` beside the ellipsis. */
function prefix(parts: readonly Grapheme[], room: number, ellipsis: number): LabelText {
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
