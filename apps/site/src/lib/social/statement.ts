/**
 * How many characters one line of a share image's statement may carry. A line is counted in characters
 * and not measured in pixels, because measuring needs the font's own metrics, which a Pure Core does not
 * read: at this size the Site's two Languages run within a character of the same width on a line.
 */
export const STATEMENT_LINE_CHARS = 54

/** The five characters an XML document cannot read literally, and what replaces each one. */
const ESCAPES: Readonly<Record<string, string>> = Object.freeze({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&apos;",
})

/** Text with the characters XML reserves replaced, so a sentence can never break the document. */
export function escapeXml(text: string): string {
	return text.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character)
}

/** SARA AM, with the Thai tone mark that may sit before it on the same consonant. */
const SARA_AM = /([\u0E48-\u0E4B]?)\u0E33/g

/**
 * Thai text with every SARA AM (ำ) drawn as its two parts, NIKHAHIT (ํ) then SARA AA (า), with a tone
 * mark between them. The share image's renderer overlaps the AA of a precomposed ำ with the next
 * consonant when no Latin text comes before it on the line; the decomposed form renders the same
 * glyphs in place. Only the drawn text uses it: the description and the alt text keep ำ.
 */
export function drawableThai(text: string): string {
	return text.replace(SARA_AM, "\u0E4D$1\u0E32")
}

/**
 * A statement split into lines at its spaces: no line is longer than `lineChars` unless it is one word,
 * and no word is ever broken, so Thai is never cut mid-word and nothing is hyphenated.
 */
export function statementLines(
	text: string,
	lineChars: number = STATEMENT_LINE_CHARS,
): readonly string[] {
	const lines: string[] = []
	let line = ""
	for (const word of text.split(/\s+/).filter((candidate) => candidate !== "")) {
		const candidate = line === "" ? word : `${line} ${word}`
		if (line !== "" && candidate.length > lineChars) {
			lines.push(line)
			line = word
			continue
		}
		line = candidate
	}
	if (line !== "") lines.push(line)
	return Object.freeze(lines)
}
