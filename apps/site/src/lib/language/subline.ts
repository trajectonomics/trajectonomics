/** One run of a sub-line: plain text, or the command name the page marks as code. */
export interface SublinePart {
	readonly text: string
	readonly code: boolean
}

/** The command name the sub-line marks as code, on a word boundary so `trajectonomics` stays text. */
const CODE_WORD = /(\btraj\b)/

/** A sub-line split around the command name, so the page can mark that word as code. */
export function sublineParts(subline: string): readonly SublinePart[] {
	return Object.freeze(
		subline
			.split(CODE_WORD)
			.map((text, index) => Object.freeze({ text, code: index % 2 === 1 }))
			.filter((part) => part.text !== ""),
	)
}
