import { COLOUR_UTILITY_PREFIXES, DEFAULT_PALETTE_FAMILIES } from "./colour-keywords"
import { type ColourLiteral, type ColourLiteralCode, colourLiteral } from "./colour-literal"
import { literalIn } from "./colour-values"

/** The prefixes that carry a colour, longest first, so `ring-offset-black` reads as a ring offset. */
const COLOUR_PREFIXES = [...COLOUR_UTILITY_PREFIXES].sort((a, b) => b.length - a.length)

/** The colour one utility class writes, if any: an arbitrary value, a palette colour, or `dark:`. */
function utilityLiteral(
	className: string,
	colourUtilities: ReadonlySet<string>,
): { readonly code: ColourLiteralCode; readonly value: string } | undefined {
	const segments = className.split(":")
	const base = segments[segments.length - 1] ?? ""
	if (segments.slice(0, -1).includes("dark")) {
		return { code: "DARK_VARIANT", value: className }
	}
	const arbitrary = /\[(.*)\]/.exec(base)?.[1]
	if (arbitrary !== undefined) {
		const literal = literalIn(arbitrary)
		return literal === undefined ? undefined : { code: "COLOUR_LITERAL", value: literal }
	}
	const prefix = COLOUR_PREFIXES.find((candidate) => base.startsWith(`${candidate}-`))
	if (prefix === undefined) return undefined
	const utilityName = base.slice(prefix.length + 1).replace(/\/\d+$/, "")
	if (colourUtilities.has(utilityName)) return undefined
	const family = utilityName.split("-")[0] ?? ""
	return DEFAULT_PALETTE_FAMILIES.includes(family)
		? { code: "DEFAULT_PALETTE_UTILITY", value: className }
		: undefined
}

/** Every colour a class attribute writes: an arbitrary colour, a palette colour, or a `dark:` variant. */
export function classLiterals(
	path: string,
	classNames: string,
	colourUtilities: ReadonlySet<string>,
): readonly ColourLiteral[] {
	return classNames.split(/\s+/).flatMap((className) => {
		if (className === "") return []
		const found = utilityLiteral(className, colourUtilities)
		return found === undefined ? [] : [colourLiteral(found.code, path, found.value)]
	})
}
