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
