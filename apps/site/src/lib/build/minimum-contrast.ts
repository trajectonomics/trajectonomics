import type { HtmlElement } from "./html"
import type { TypeScale } from "./type-scale"

/** WCAG AA: 4.5:1 for normal text, and 3:1 for text it calls large. */
const TEXT_CONTRAST = 4.5
const LARGE_TEXT_CONTRAST = 3

/** WCAG large text: 24 pixels, or 18.66 pixels at a weight of 700 and above. */
const LARGE_TEXT_PIXELS = 24
const LARGE_BOLD_PIXELS = 18.66
const BOLD_WEIGHT = 700

/** The type a browser renders body text at when no utility says otherwise. */
const BASE_PIXELS = 16
const BASE_WEIGHT = 400

/** The size and weight one class list sets, where a utility names one. */
function typeIn(
	classNames: string,
	scale: TypeScale,
): { readonly pixels: number | undefined; readonly weight: number | undefined } {
	const found: { pixels: number | undefined; weight: number | undefined } = {
		pixels: undefined,
		weight: undefined,
	}
	for (const utility of classNames.split(/\s+/)) {
		const separator = utility.indexOf("-")
		if (separator === -1) continue
		const name = utility.slice(separator + 1)
		if (utility.startsWith("text-")) found.pixels = scale.sizesPx[name] ?? found.pixels
		if (utility.startsWith("font-")) found.weight = scale.weights[name] ?? found.weight
	}
	return found
}

/** How large and how heavy a chain of elements renders its text, with the nearest element winning. */
function renderedType(
	chain: readonly HtmlElement[],
	scale: TypeScale,
): { readonly pixels: number; readonly weight: number } {
	const rendered = { pixels: BASE_PIXELS, weight: BASE_WEIGHT }
	for (const element of chain) {
		const found = typeIn(element.attributes["class"] ?? "", scale)
		rendered.pixels = found.pixels ?? rendered.pixels
		rendered.weight = found.weight ?? rendered.weight
	}
	return rendered
}

/** The contrast a chain of elements must meet: the large-text bar only for text WCAG calls large. */
export function minimumContrast(chain: readonly HtmlElement[], scale: TypeScale): number {
	const rendered = renderedType(chain, scale)
	const large =
		rendered.pixels >= LARGE_TEXT_PIXELS ||
		(rendered.weight >= BOLD_WEIGHT && rendered.pixels >= LARGE_BOLD_PIXELS)
	return large ? LARGE_TEXT_CONTRAST : TEXT_CONTRAST
}
