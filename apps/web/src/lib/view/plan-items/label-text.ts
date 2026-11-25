/**
 * A display label in a form: the name a person reads in place of an id (sim ADR 0032, cli ADR 0080). The form trims what
 * the person typed before it sends it, so a stray space never reaches `traj`, which refuses untrimmed text. The checks
 * here are shape checks only; the CLI owns the rule, and `labelProblem` repeats sim's `isDisplayLabel`
 * (`packages/core/sim/src/check/label-rule.ts`) because the Dashboard imports no core.
 */

/** The most code points `traj` takes in a display label. */
export const LABEL_MAX = 80

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

/** The label a draft names, trimmed; null for an empty field, which leaves the item unnamed. */
export function labelOf(text: string): string | null {
	const trimmed = text.trim()
	return trimmed === "" ? null : trimmed
}

/** Why a label cannot be saved, or null when it can: over 80 code points, or a character `traj` refuses. */
export function labelProblem(text: string): string | null {
	const label = labelOf(text)
	if (label === null) return null
	const codePoints = Array.from(label, (character) => character.codePointAt(0) ?? 0)
	if (codePoints.length > LABEL_MAX) {
		return `Enter a name of at most ${LABEL_MAX} characters, or leave it empty.`
	}
	if (codePoints.some(isForbidden) || hasStrayJoiner(label)) {
		return "Enter a name with no control, invisible or bidirectional characters."
	}
	return null
}
