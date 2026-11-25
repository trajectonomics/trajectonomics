import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { unescapeText } from "./html-tag"
import { builtLanguagePages } from "./language-pages"
import { pageUrl } from "./page-url"

/** A `<title>` element: the scanner skips a code element's body, so the text is read here. */
const TITLE = /<title\b[^>]*>([\s\S]*?)<\/title>/gi

/** The text of every `<title>` on a page, in document order, with the writer's escaping undone. */
function titlesOf(html: string): readonly string[] {
	return [...html.matchAll(TITLE)].map((match) => unescapeText(match[1] ?? "").trim())
}

/** One page carries one title, and it is the text its own Dictionary states for that Language. */
function failuresOf(file: BuiltFile, expected: string): readonly BuildFailure[] {
	const path = pageUrl(file.path)
	const titles = titlesOf(file.content)
	const [title] = titles
	if (title === undefined) {
		return [buildFailure("TITLE_MISSING", path, "carries no <title>, so a tab shows only the URL.")]
	}
	if (titles.length > 1) {
		return [buildFailure("TITLE_DUPLICATE", path, `carries ${titles.length} titles, not one.`)]
	}
	if (title === expected) return []
	return [buildFailure("TITLE_TEXT_WRONG", path, `titles itself "${title}", not "${expected}".`)]
}

/** Every page names itself in the one document title its own Dictionary states. */
export function checkDocumentTitle(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtLanguagePages(files).flatMap(({ page, file }) => failuresOf(file, page.documentTitle))
}
