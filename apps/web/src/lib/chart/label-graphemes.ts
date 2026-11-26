/** A generous width for one character of a marker label in the chart's small text, in pixels. */
const CHAR_PX = 7
/** A monospace cell, which the chart's 11px code labels draw narrower than the sans-serif text. */
const CODE_CHAR_PX = 7
/** The width of a wide sans-serif letter, such as most capitals, in pixels. */
const BROAD_PX = 10
/** The width of a wide Thai consonant, in either font, in pixels. */
const THAI_BROAD_PX = 11
/** The width of the widest characters: East Asian, or a sans-serif `m`, `M`, `W`, `@`, `%` or dash. */
const WIDEST_PX = 12
/** The width of one emoji in the chart's small text, in pixels: a glyph that is wider than a letter. */
const EMOJI_PX = 14

/** The graphemes of a label in Thai segmentation: a combining mark stays with its base, a pair never splits. */
const GRAPHEMES = new Intl.Segmenter("th", { granularity: "grapheme" })

/** Thai vowels written before the consonant they are read after: เ แ โ ใ ไ. One alone reads as nothing. */
const LEADING_VOWELS = /^[เ-ไ]+$/

/** A character that draws with no width of its own: a Thai tone mark, a variation selector, a joiner. */
const ZERO_WIDTH = /^[\p{Mn}\p{Me}\p{Cf}]$/u
/** A grapheme that holds a pictograph, such as an emoji or a flag: one glyph, wider than a letter. */
const PICTURE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u
/**
 * East Asian scripts, and the CJK punctuation and full-width forms drawn at a full em beside them. The
 * scripts match on `Script_Extensions`, so `ー` and `・` count with the kana they extend even though their
 * own script is Common, and U+3200–33FF holds the enclosed CJK letters and months such as `㈱`.
 */
const EAST_ASIAN =
	/^[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script_Extensions=Hangul}\u3000-\u303F\u3200-\u33FF\uFF01-\uFF60\uFFE0-\uFFE6]$/u
const THAI_BROAD = /^[ญฌฒณ]$/
/** U+00B7 is Script_Extensions=Han but draws as a narrow dot, as on `main`; it must not take a full em. */
const MIDDLE_DOT = /^\u00B7$/u
/** Sans-serif characters wider than {@link CHAR_PX}. A monospace font draws them as wide as the others. */
const WIDEST = /^[mMW@%—]$/
const BROAD = /^[A-Z&w]$/

/** One piece a label may be cut between, with its estimated width. */
export interface Grapheme {
	readonly text: string
	readonly width: number
}

/** The label's graphemes, each with its estimated width: a mark adds none, an emoji adds one glyph's. */
export function graphemes(label: string, code: boolean): Grapheme[] {
	return clusters(label).map((text) => ({ text, width: graphemeWidth(text, code) }))
}

/** The label's graphemes, with a Thai leading vowel kept to the one after it. */
function clusters(label: string): string[] {
	const found: string[] = []
	for (const { segment } of GRAPHEMES.segment(label)) {
		const last = found.at(-1)
		if (last !== undefined && LEADING_VOWELS.test(last)) found[found.length - 1] = last + segment
		else found.push(segment)
	}
	return found
}

/**
 * The width of one grapheme: a joined emoji counts once, as the one glyph a page with an emoji font draws,
 * and a Thai base with its marks one character.
 */
function graphemeWidth(grapheme: string, code: boolean): number {
	if (PICTURE.test(grapheme)) return code ? CODE_CHAR_PX * 2 : EMOJI_PX
	let width = 0
	for (const character of grapheme) width += characterWidth(character, code)
	return width
}

/** The width of one character, rounded up for the wide ones so a box is not narrower than its words. */
function characterWidth(character: string, code: boolean): number {
	if (ZERO_WIDTH.test(character)) return 0
	if (MIDDLE_DOT.test(character)) return CHAR_PX
	if (EAST_ASIAN.test(character)) return WIDEST_PX
	if (THAI_BROAD.test(character)) return THAI_BROAD_PX
	if (code) return CODE_CHAR_PX
	if (WIDEST.test(character)) return WIDEST_PX
	return BROAD.test(character) ? BROAD_PX : CHAR_PX
}
