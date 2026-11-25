/** A generous width for one character of a marker label in the chart's small text, in pixels. */
const CHAR_PX = 7
/** The width of the ellipsis in the chart's 12px sans-serif text, in pixels. */
const ELLIPSIS_PX = 12
/** The width of the ellipsis in the chart's 11px monospace text, in pixels. */
const CODE_ELLIPSIS_PX = 7
/** The width of one emoji in the chart's small text, in pixels. */
const EMOJI_PX = 14

/** The graphemes of a label in Thai segmentation: a combining mark stays with its base, a pair never splits. */
const GRAPHEMES = new Intl.Segmenter("th", { granularity: "grapheme" })

/** A character that draws with no width of its own: a Thai tone mark, a variation selector, a joiner. */
const ZERO_WIDTH = /^[\p{Mn}\p{Me}\p{Cf}]$/u

/** A grapheme that holds a pictograph, such as an emoji: one glyph, wider than a letter. */
const PICTURE = /\p{Extended_Pictographic}/u

/** A label's words and the room they take: an estimated width, so a row reserves the label's real box. */
export interface LabelText {
	readonly text: string
	readonly width: number
}

/** One grapheme and its estimated width. */
interface Grapheme {
	readonly text: string
	readonly width: number
}

/** The label shortened with an ellipsis to fit `room` pixels; the whole label when it fits, none when even the
 * ellipsis does not. It cuts between graphemes, so a Thai cluster keeps its tone mark and an emoji its pair. */
export function fitted(label: string, room: number, code: boolean): LabelText {
	const parts = graphemes(label, code)
	const whole = parts.reduce((sum, part) => sum + part.width, 0)
	if (whole <= room) return { text: label, width: whole }
	const kept = prefix(parts, room, ellipsis(code))
	if (kept.text === "") return kept
	return { text: `${kept.text}…`, width: kept.width + ellipsis(code) }
}

/** At least the label's first grapheme when neither side of a crowded rule has room, so a marker is never blank. */
export function stub(label: string, room: number, code: boolean): LabelText {
	const parts = graphemes(label, code)
	const kept = prefix(parts, room, ellipsis(code))
	if (kept.text !== "") return { text: `${kept.text}…`, width: kept.width + ellipsis(code) }
	const [first] = parts
	return first === undefined ? { text: "", width: 0 } : { text: first.text, width: first.width }
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

/** The label's graphemes, each with its estimated width: a mark adds none, an emoji adds one glyph's. */
function graphemes(label: string, code: boolean): Grapheme[] {
	return Array.from(GRAPHEMES.segment(label), (part) => ({
		text: part.segment,
		width: graphemeWidth(part.segment, code),
	}))
}

/** The width of one grapheme: a combined emoji one glyph, a Thai base with its marks one character. */
function graphemeWidth(grapheme: string, code: boolean): number {
	if (PICTURE.test(grapheme)) return code ? CHAR_PX * 2 : EMOJI_PX
	let width = 0
	for (const character of grapheme) if (!ZERO_WIDTH.test(character)) width += CHAR_PX
	return width
}

/** The width of the ellipsis: the sans-serif one is wider than a monospace cell. */
function ellipsis(code: boolean): number {
	return code ? CODE_ELLIPSIS_PX : ELLIPSIS_PX
}
