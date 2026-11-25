import type { Check } from "./codes"
import { needsLevy, tallyLabel } from "./levy-fields"
import { boundedInt, str } from "./scalars"
import { checkShape, type Field, opt, req } from "./shape"

const prepayment: Check = boundedInt(0, 10_000, "RATE_OUT_OF_RANGE")

/** A field this kind of Flow never takes. */
export const NOT_ALLOWED: Field = opt((_value, path, emit) => emit("FIELD_NOT_ALLOWED", path))

export const label: (hasLevy: boolean) => Field = tallyLabel

/** A Spending `rule` on a Flow that is not an expense. */
export const NOT_EXPENSE: Field = opt((_value, path, emit) => emit("RULE_NOT_EXPENSE", path))

const MAX_CATEGORY_LENGTH = 64

/** The rule an expense category must meet, in the words a refusal quotes (ADR 0018, amended 2026-11-25). */
export const EXPENSE_CATEGORY_RULE =
	"1 to 64 code points, no control, invisible or bidirectional characters, and no leading or trailing whitespace"

/** U+2028 and U+2029, the line and paragraph separators. */
const LINE_SEPARATORS = new Set([0x2028, 0x2029])

/** Whether a code point is one a category may not carry: it is invisible, reorders text, or is not text. */
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

/** Leading or trailing whitespace, which also refuses a category that is whitespace alone. */
const EDGE_WHITESPACE = /^\s|\s$/u

/** An expense category: text that meets {@link EXPENSE_CATEGORY_RULE}, else `INVALID_CATEGORY`. */
export const expenseCategory: Check = (value, path, emit) => {
	if (typeof value !== "string") return emit("WRONG_TYPE", path)
	const codePoints = Array.from(value, (character) => character.codePointAt(0) ?? 0)
	const bad =
		codePoints.length === 0 ||
		codePoints.length > MAX_CATEGORY_LENGTH ||
		codePoints.some(isForbidden) ||
		hasStrayJoiner(value) ||
		EDGE_WHITESPACE.test(value)
	if (bad) emit("INVALID_CATEGORY", path)
}

const cappedShape: Check = (value, path, emit) =>
	void checkShape(value, path, { levy: req(str), bps: req(prepayment), upTo: req(str) }, emit)

/** The optional second Prepayment share, its Levy and the Measure id it is capped at. */
export const cappedPrepayment = (hasLevy: boolean): Field => needsLevy(hasLevy, cappedShape)
