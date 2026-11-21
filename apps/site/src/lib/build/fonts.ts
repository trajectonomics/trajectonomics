import { SITE_ORIGIN } from "../site"
import { sameOriginPath } from "./asset-url"
import { type BuiltFile, fileAt, fileBytes } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { type FontReference, fontReferences } from "./font-references"
import { pageStylesheets } from "./page-stylesheets"
import { pageUrl } from "./page-url"

/** The most one page's font files may weigh, uncompressed. */
export const FONT_BUDGET_BYTES = 48_000

const WOFF2 = /\.woff2(?:[?#]|$)/i
const DATA = /^data:/i
const REMOTE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i
const HOST = /^(?:[a-z][a-z0-9+.-]*:)?\/\/([^/?#]+)/i
const SITE_HOST = new URL(SITE_ORIGIN).host

type FontCode =
	| "FONT_BUDGET_OVER"
	| "FONT_FILE_MISSING"
	| "REMOTE_FONT_URL_PRESENT"
	| "FONT_FROM_ANOTHER_ORIGIN"
	| "DATA_FONT_URL_PRESENT"

const MESSAGES: Readonly<Record<FontCode, string>> = Object.freeze({
	FONT_BUDGET_OVER: `the font budget is ${FONT_BUDGET_BYTES} bytes, uncompressed, per page.`,
	FONT_FILE_MISSING: "a stylesheet asks for it, and the build produced no such font file.",
	REMOTE_FONT_URL_PRESENT:
		"asks for a font, or a stylesheet that can declare one, at an absolute URL; the Site references its own.",
	FONT_FROM_ANOTHER_ORIGIN: "asks for a font source on another origin; the Site serves its own.",
	DATA_FONT_URL_PRESENT: "embeds a font in a data: URL instead of serving it from the build.",
})

/** The host a font URL names, lowercased, or `undefined` for a URL that names the Site by path. */
function hostOf(url: string): string | undefined {
	return HOST.exec(url.trim())?.[1]?.toLowerCase()
}

/** The font paths, missing font files and rules one page breaks. */
interface PageFonts {
	readonly paths: Set<string>
	readonly missing: Set<string>
	readonly codes: Set<FontCode>
}

/** Add one reference to a page's tally, classifying it before it can join the byte total. */
function tally(reference: FontReference, files: readonly BuiltFile[], fonts: PageFonts): void {
	const url = reference.url.trim()
	if (DATA.test(url)) {
		fonts.codes.add("DATA_FONT_URL_PRESENT")
		return
	}
	if (REMOTE.test(url)) {
		fonts.codes.add("REMOTE_FONT_URL_PRESENT")
		const host = hostOf(url)
		if (host !== undefined && host !== SITE_HOST) fonts.codes.add("FONT_FROM_ANOTHER_ORIGIN")
		return
	}
	const path = sameOriginPath(reference.fromPath, url)
	if (path === undefined || !WOFF2.test(path)) return
	fonts.paths.add(path)
	if (fileAt(files, path) === undefined) fonts.missing.add(path)
}

/** Every font reference one page writes: its own markup, and each stylesheet it paints with. */
function referencesOf(files: readonly BuiltFile[], page: BuiltFile): readonly FontReference[] {
	return [
		...fontReferences(page),
		...pageStylesheets(files, page).files.flatMap((sheet) => fontReferences(sheet)),
	]
}

/** One page's failures: the rules it breaks, the fonts it cannot find, and its byte total. */
function failuresOf(files: readonly BuiltFile[], page: BuiltFile): readonly BuildFailure[] {
	const fonts: PageFonts = { paths: new Set(), missing: new Set(), codes: new Set() }
	for (const reference of referencesOf(files, page)) tally(reference, files, fonts)
	const url = pageUrl(page.path)
	const failures = [...fonts.codes].map((code) => buildFailure(code, url, MESSAGES[code]))
	for (const path of fonts.missing) {
		failures.push(buildFailure("FONT_FILE_MISSING", path, MESSAGES.FONT_FILE_MISSING))
	}
	const bytes = [...fonts.paths].reduce((sum, path) => {
		const file = fileAt(files, path)
		return file === undefined ? sum : sum + fileBytes(file)
	}, 0)
	if (bytes > FONT_BUDGET_BYTES) {
		const message = `its fonts are ${bytes} bytes; ${MESSAGES.FONT_BUDGET_OVER}`
		failures.push(buildFailure("FONT_BUDGET_OVER", url, message))
	}
	return failures
}

/** Every built page serves its own latin faces within the font budget, and from nowhere else. */
export function checkFonts(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return files
		.filter((file) => file.path.endsWith(".html"))
		.flatMap((page) => failuresOf(files, page))
}
