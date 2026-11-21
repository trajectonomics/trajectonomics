import type { Theme } from "../design/tokens"
import type { HtmlElement } from "./html"

/** The Semantic Token Roles a chain of elements paints, for one background and one text colour. */
export interface PaintedColours {
	readonly background: string | undefined
	readonly foreground: string | undefined
}

/** The colour a Theme resolves a Semantic Token Role to, or `undefined` when it defines none. */
export function colourOf(theme: Theme, role: string | undefined): string | undefined {
	return role === undefined ? undefined : theme.colours[role]
}

/** One utility class split into the part before the first dash and the rest. */
function splitUtility(
	className: string,
): { readonly prefix: string; readonly name: string } | undefined {
	const separator = className.indexOf("-")
	if (separator === -1) return undefined
	return { prefix: className.slice(0, separator), name: className.slice(separator + 1) }
}

/** The background and text Semantic Token Roles a chain of elements paints, nearest element first. */
export function paintedColours(
	chain: readonly HtmlElement[],
	colourUtilities: readonly string[],
): PaintedColours {
	const roles = new Set(colourUtilities)
	return Object.freeze({
		background: findRole(chain, "bg", roles),
		foreground: findRole(chain, "text", roles),
	})
}

/** The role the nearest element of the chain paints with one utility prefix, or `undefined`. */
function findRole(
	chain: readonly HtmlElement[],
	prefix: string,
	roles: ReadonlySet<string>,
): string | undefined {
	for (const element of [...chain].reverse()) {
		for (const className of (element.attributes["class"] ?? "").split(/\s+/)) {
			const utility = splitUtility(className)
			if (utility?.prefix === prefix && roles.has(utility.name)) return utility.name
		}
	}
	return undefined
}
