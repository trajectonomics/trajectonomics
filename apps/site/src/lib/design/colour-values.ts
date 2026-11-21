import { ALLOWED_VALUES, NAMED_COLOURS } from "./colour-keywords"
import { type ColourLiteral, colourLiteral } from "./colour-literal"

/** A hexadecimal colour, a colour function, or a value that only names a role. */
const HEXADECIMAL = /#[0-9a-f]{3,8}\b/i
const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\s*\(/i
const NAMED_VALUE = new RegExp(`\\b(?:${NAMED_COLOURS.join("|")})\\b`, "i")
const ALLOWED_VALUE = new RegExp(
	`var\\(--ds-[\\w-]+\\)|\\b(?:${[...ALLOWED_VALUES, "initial", "unset", "revert"].join("|")})\\b`,
	"gi",
)

/** The first colour a CSS value writes, or `undefined` when it names only a role or an allowed keyword. */
export function literalIn(value: string): string | undefined {
	const rest = value.replace(ALLOWED_VALUE, " ")
	for (const pattern of [HEXADECIMAL, COLOUR_FUNCTION, NAMED_VALUE]) {
		const found = pattern.exec(rest)
		if (found !== null) return found[0].trim()
	}
	return undefined
}

/** The part after the first colon of each fragment: the value of a declaration, never its property. */
function valuesAfterColons(declarations: readonly string[]): readonly string[] {
	return declarations.flatMap((declaration) => {
		const colon = declaration.indexOf(":")
		return colon === -1 ? [] : [declaration.slice(colon + 1)]
	})
}

/** The values of the declarations in a stylesheet, at any nesting depth, skipping comments. */
function declarationValues(css: string): readonly string[] {
	const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "")
	return [...stripped.matchAll(/\{([^{}]*)\}/g)].flatMap((body) =>
		valuesAfterColons((body[1] ?? "").split(";")),
	)
}

/** Every raw colour a stylesheet or an inline style writes, instead of naming a role. */
export function valueLiterals(path: string, css: string): readonly ColourLiteral[] {
	const values = css.includes("{") ? declarationValues(css) : valuesAfterColons(css.split(";"))
	return values.flatMap((value) => {
		const literal = literalIn(value)
		return literal === undefined ? [] : [colourLiteral("COLOUR_LITERAL", path, literal)]
	})
}
