/** The most code points a display label may hold. */
export const DISPLAY_LABEL_MAX = 80

/** The rule a display label must meet, in the words a refusal quotes (sim ADR 0032). */
export const DISPLAY_LABEL_RULE =
	"1 to 80 code points, no control, invisible or bidirectional characters, and no leading or trailing whitespace"

/** U+2028 and U+2029, the line and paragraph separators. */
const LINE_SEPARATORS = new Set([0x2028, 0x2029])

/** Whether a code point is one a label may not carry: it is invisible, reorders text, or is not text. */
function isForbidden(code: number): boolean {
	return (
		code < 0x20 || // C0 control characters
		(code >= 0x7f && code <= 0x9f) || // DEL and C1 control characters
		LINE_SEPARATORS.has(code) ||
		code === 0x200b || // zero-width space
		code === 0x200c || // zero-width non-joiner
		code === 0xfeff || // zero-width no-break space, the byte order mark
		(code >= 0x202a && code <= 0x202e) || // bidirectional embeddings and overrides
		(code >= 0x2066 && code <= 0x2069) || // bidirectional isolates
		(code >= 0xd800 && code <= 0xdfff) // a lone surrogate: `Array.from` keeps a pair as one code point
	)
}

const ZERO_WIDTH_JOINER = "\u200d"

/** A zero-width joiner that links two pictographs, with an optional variation selector or skin tone before it. */
const EMOJI_JOINER =
	/(?<=\p{Extended_Pictographic}[\u{FE0F}\u{1F3FB}-\u{1F3FF}]?)\u200d(?=\p{Extended_Pictographic})/gu

/** Whether a zero-width joiner stands anywhere but inside an emoji sequence, where it is invisible text. */
const hasStrayJoiner = (value: string): boolean =>
	value.replace(EMOJI_JOINER, "").includes(ZERO_WIDTH_JOINER)

/** Leading or trailing whitespace, which also refuses a label that is whitespace alone. */
const EDGE_WHITESPACE = /^\s|\s$/u

/** Whether a string is text of 1 to `max` code points, with no byte that reads as another label. */
export function isLabelText(value: string, max: number): boolean {
	const codePoints = Array.from(value, (character) => character.codePointAt(0) ?? 0)
	return (
		codePoints.length > 0 &&
		codePoints.length <= max &&
		!codePoints.some((code) => isForbidden(code)) &&
		!hasStrayJoiner(value) &&
		!EDGE_WHITESPACE.test(value)
	)
}

/** Whether a value is a display label: {@link DISPLAY_LABEL_RULE}, counted in code points. */
export function isDisplayLabel(value: unknown): value is string {
	return typeof value === "string" && isLabelText(value, DISPLAY_LABEL_MAX)
}
