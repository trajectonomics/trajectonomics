import type { BuiltFile } from "./built-files"
import { scanHtml } from "./html"

/** A font file's extension, with an optional query or fragment, so a URL names a font. */
const FONT_FILE = /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i
/** The MIME types a font may carry in a `data:` URL. */
const DATA_FONT = /^data:(?:font\/|application\/(?:x-)?font)/i
/** A `url()` in a stylesheet, whether quoted or bare. */
const CSS_URL = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi
/** An `@import`, which loads a stylesheet that may declare a font. */
const CSS_IMPORT = /@import\s+(?:url\(\s*)?["']([^"']+)["']/gi
const HTML_COMMENT = /<!--[\s\S]*?-->/g
const SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/gi
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g

/** One font, or one stylesheet that may declare a font, that a built file asks for. */
export interface FontReference {
	readonly url: string
	readonly fromPath: string
}

/** Whether a URL names a font, by its file extension or by the MIME type of a data: URL. */
function isFontUrl(url: string): boolean {
	const trimmed = url.trim()
	return FONT_FILE.test(trimmed) || DATA_FONT.test(trimmed)
}

/** The href of a link that requests a font, or `undefined` for any other link. */
function linkedFont(attributes: Readonly<Record<string, string>>): string | undefined {
	const href = attributes["href"]
	if (href === undefined) return undefined
	const as = (attributes["as"] ?? "").toLowerCase()
	return as === "font" || isFontUrl(href) ? href : undefined
}

/** The text a font rule reads, so a commented-out or script-embedded URL is not a request. */
function readable(content: string): string {
	return content.replace(HTML_COMMENT, "").replace(SCRIPT, "").replace(CSS_COMMENT, "")
}

/** Every font a built file asks for: a stylesheet `url()`, an `@import`, or a link that preloads one. */
export function fontReferences(file: BuiltFile): readonly FontReference[] {
	const text = readable(file.content)
	const inCss = [...text.matchAll(CSS_URL)].flatMap((match) => {
		const url = match[1]
		return url !== undefined && isFontUrl(url) ? [url] : []
	})
	const inImports = [...text.matchAll(CSS_IMPORT)].flatMap((match) => {
		const url = match[1]
		return url === undefined ? [] : [url]
	})
	const inLinks = scanHtml(file.content)
		.elements.filter((element) => element.tag === "link")
		.flatMap((element) => {
			const url = linkedFont(element.attributes)
			return url === undefined ? [] : [url]
		})
	return [...inCss, ...inImports, ...inLinks].map((url) => ({ url, fromPath: file.path }))
}
