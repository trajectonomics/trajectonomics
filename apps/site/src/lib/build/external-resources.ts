import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** The only origin the Site may load a resource from is its own. */
const SITE_HOST = "trajectonomics.com"

const SCRIPT = /<script\b[^>]*\bsrc="([^"]+)"/gi
const LINK = /<link\b([^>]*)>/gi
const RESOURCE_REL = /\b(?:stylesheet|modulepreload)\b/i
const PRELOAD_REL = /\bpreload\b/i
const RESOURCE_AS = /\b(?:font|style|script)\b/i
const CSS_URL = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi
const CSS_IMPORT = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/gi

function attribute(attributes: string, name: string): string | undefined {
	return new RegExp(`\\b${name}="([^"]*)"`, "i").exec(attributes)?.[1]
}

/** The href of a link that loads a script, stylesheet or font, if this link loads one at all. */
function linkUrl(attributes: string): string | undefined {
	const rel = attribute(attributes, "rel") ?? ""
	const as = attribute(attributes, "as") ?? ""
	const loadsResource = RESOURCE_REL.test(rel) || (PRELOAD_REL.test(rel) && RESOURCE_AS.test(as))
	return loadsResource ? attribute(attributes, "href") : undefined
}

function urlsInHtml(html: string): readonly string[] {
	const scripts = [...html.matchAll(SCRIPT)].map((match) => match[1] ?? "")
	const links = [...html.matchAll(LINK)].flatMap((match) => {
		const url = linkUrl(match[1] ?? "")
		return url === undefined ? [] : [url]
	})
	return [...scripts, ...links]
}

function urlsInCss(css: string): readonly string[] {
	const fonts = [...css.matchAll(CSS_URL)].map((match) => match[1] ?? "")
	const imports = [...css.matchAll(CSS_IMPORT)].map((match) => match[1] ?? "")
	return [...fonts, ...imports]
}

function urlsOf(file: BuiltFile): readonly string[] {
	if (file.path.endsWith(".html")) return urlsInHtml(file.content)
	if (file.path.endsWith(".css")) return urlsInCss(file.content)
	return []
}

/** The host of an absolute URL, or `undefined` for a relative one, which is already same-origin. */
function hostOf(url: string): string | undefined {
	return /^(?:https?:)?\/\/([^/?#]+)/i.exec(url.trim())?.[1]?.toLowerCase()
}

function isExternal(url: string): boolean {
	const host = hostOf(url)
	return host !== undefined && host !== SITE_HOST
}

function failureFor(file: BuiltFile, url: string): BuildFailure {
	return buildFailure(
		"EXTERNAL_RESOURCE_PRESENT",
		file.path,
		`loads ${url} from another origin; the Site loads no third-party script, font or tracker.`,
	)
}

/** No script, stylesheet or font may point at another origin: the page calls no other host. */
export function checkExternalResources(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return files.flatMap((file) =>
		urlsOf(file)
			.filter(isExternal)
			.map((url) => failureFor(file, url)),
	)
}
