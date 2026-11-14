import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { scanHtml } from "./html"
import { pageUrl } from "./page-url"

/** The font formats a page could download instead of drawing words with the visitor's fonts. */
const FONT_FILE = /\.(?:woff2?|ttf|otf|eot)$/i
const FONT_URL = /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i
const FONT_FACE = /@font-face\b/i
const REMOTE = /^(?:https?:)?\/\//i
const DATA_FONT = /^data:(?:font\/|application\/(?:x-)?font)/i
const CSS_URL = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi
const HTML_COMMENT = /<!--[\s\S]*?-->/g
const SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/gi
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g

type WebFontCode =
	| "FONT_FILE_PRESENT"
	| "FONT_FACE_PRESENT"
	| "REMOTE_FONT_URL_PRESENT"
	| "DATA_FONT_URL_PRESENT"

const MESSAGES: Readonly<Record<WebFontCode, string>> = Object.freeze({
	FONT_FILE_PRESENT: "ships a font file; the Site draws Thai from the visitor's own fonts.",
	FONT_FACE_PRESENT: "declares a font face, so the browser downloads a font.",
	REMOTE_FONT_URL_PRESENT: "loads a font from another origin, so the visitor downloads one.",
	DATA_FONT_URL_PRESENT:
		"embeds a font in a data: URL instead of drawing with the visitor's fonts.",
})

/** Whether a URL names a font, by its file extension or by the MIME type of a data: URL. */
function isFontUrl(url: string): boolean {
	return FONT_URL.test(url) || DATA_FONT.test(url.trim())
}

/** The URL of a link that downloads a font, or `undefined` for any other link. */
function linkUrl(attributes: Readonly<Record<string, string>>): string | undefined {
	const href = attributes["href"]
	if (href === undefined) return undefined
	const as = (attributes["as"] ?? "").toLowerCase()
	return as === "font" || isFontUrl(href) ? href : undefined
}

/** The text a font rule reads, so a commented-out or script-embedded font is not a download. */
function readable(content: string): string {
	return content.replace(HTML_COMMENT, "").replace(SCRIPT, "").replace(CSS_COMMENT, "")
}

/** Every URL in a built file that names a font: a `url()`, or a link that preloads one. */
function fontUrls(file: BuiltFile): readonly string[] {
	const inCss = [...readable(file.content).matchAll(CSS_URL)].flatMap((match) => {
		const url = match[1]
		return url !== undefined && isFontUrl(url) ? [url] : []
	})
	const inLinks = scanHtml(file.content)
		.elements.filter((element) => element.tag === "link")
		.flatMap((element) => {
			const url = linkUrl(element.attributes)
			return url === undefined ? [] : [url]
		})
	return [...inCss, ...inLinks]
}

/** Every rule one file breaks: a font file, a font face, a remote font URL, or a data: font URL. */
function failuresOf(file: BuiltFile): readonly BuildFailure[] {
	const codes = new Set<WebFontCode>()
	if (FONT_FILE.test(file.path)) codes.add("FONT_FILE_PRESENT")
	if (FONT_FACE.test(readable(file.content))) codes.add("FONT_FACE_PRESENT")
	for (const url of fontUrls(file)) {
		if (DATA_FONT.test(url.trim())) codes.add("DATA_FONT_URL_PRESENT")
		else if (REMOTE.test(url.trim())) codes.add("REMOTE_FONT_URL_PRESENT")
	}
	const path = file.path.endsWith(".html") ? pageUrl(file.path) : file.path
	return [...codes].map((code) => buildFailure(code, path, MESSAGES[code]))
}

/** The Site downloads no web font, so Thai type is a system stack (ADR 0003). */
export function checkNoWebFonts(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return files.flatMap(failuresOf)
}
