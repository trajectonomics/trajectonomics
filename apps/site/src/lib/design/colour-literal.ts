/** Stable codes for every way a Site source writes a colour instead of naming a Semantic Token Role. */
export type ColourLiteralCode = "COLOUR_LITERAL" | "DEFAULT_PALETTE_UTILITY" | "DARK_VARIANT"

/** One raw colour a Site source writes: the rule that caught it, the file, and the text as written. */
export interface ColourLiteral {
	readonly code: ColourLiteralCode
	readonly path: string
	readonly value: string
}

/** A frozen finding, so a caller cannot edit the rule's verdict. */
export function colourLiteral(code: ColourLiteralCode, path: string, value: string): ColourLiteral {
	return Object.freeze({ code, path, value })
}
