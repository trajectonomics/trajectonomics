import { type ColourLiteral, colourLiteral } from "./colour-literal"
import { classLiterals } from "./colour-utilities"
import { literalIn, valueLiterals } from "./colour-values"

/** One authored source file of the Site: its path in the repository, and its text. */
export interface SiteSource {
	readonly path: string
	readonly content: string
}

export type { ColourLiteral, ColourLiteralCode } from "./colour-literal"

/** The extensions that carry the Site's styling: a stylesheet, a template, or an inline SVG. */
const STYLING_SOURCES = new Set(["astro", "css", "html", "svg"])

const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
const CLASS_ATTRIBUTE = /\bclass\s*=\s*["']([^"']*)["']/gi
const STYLE_ATTRIBUTE = /\bstyle\s*=\s*["']([^"']*)["']/gi
const PAINT_ATTRIBUTE = /\b(?:fill|stroke)\s*=\s*["']([^"']*)["']/gi

/** Every colour a template writes: a style block, a class, an inline style, or an SVG paint. */
function templateLiterals(
	path: string,
	content: string,
	colourUtilities: ReadonlySet<string>,
): readonly ColourLiteral[] {
	const literals: ColourLiteral[] = []
	for (const match of content.matchAll(STYLE_BLOCK)) {
		literals.push(...valueLiterals(path, match[1] ?? ""))
	}
	for (const match of content.matchAll(STYLE_ATTRIBUTE)) {
		literals.push(...valueLiterals(path, match[1] ?? ""))
	}
	for (const match of content.matchAll(PAINT_ATTRIBUTE)) {
		const literal = literalIn(match[1] ?? "")
		if (literal !== undefined) literals.push(colourLiteral("COLOUR_LITERAL", path, literal))
	}
	for (const match of content.matchAll(CLASS_ATTRIBUTE)) {
		literals.push(...classLiterals(path, match[1] ?? "", colourUtilities))
	}
	return literals
}

/** Every colour the Site's own styling sources write, instead of naming a Semantic Token Role. */
export function findColourLiterals(
	sources: readonly SiteSource[],
	colourUtilities: readonly string[],
): readonly ColourLiteral[] {
	const roles = new Set(colourUtilities)
	return sources
		.filter((source) => STYLING_SOURCES.has(source.path.split(".").pop()?.toLowerCase() ?? ""))
		.flatMap((source) =>
			source.path.toLowerCase().endsWith(".css")
				? valueLiterals(source.path, source.content)
				: templateLiterals(source.path, source.content, roles),
		)
}
