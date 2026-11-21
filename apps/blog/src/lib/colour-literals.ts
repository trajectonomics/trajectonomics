/** A colour written as a value instead of read from a Theme role. */
const COLOUR_LITERAL =
	/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|\b(?:white|black)\b/g

/** A CSS comment, whose prose may name a colour without painting one. */
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g

/**
 * Every colour literal in a stylesheet or a component, once comments are dropped. The blog paints
 * only from the Theme's roles, so any result is a defect.
 */
export function colourLiterals(source: string): readonly string[] {
	return [...source.replace(CSS_COMMENT, "").matchAll(COLOUR_LITERAL)].map((match) => match[0])
}
