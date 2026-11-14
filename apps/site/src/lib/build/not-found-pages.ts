import { FALLBACK_LANGUAGE, type Language } from "../language/language"
import { LANGUAGES } from "../language/languages"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml } from "./html"
import { checkDeclaredLanguage } from "./page-language"

/** One Not-found page the build must produce, and the Language it answers in. */
export interface NotFoundPage {
	readonly path: string
	readonly language: Language
}

/** The root page answers English, and each Locale URL has one of its own ([ADR 0003]). */
export const NOT_FOUND_PAGES: readonly NotFoundPage[] = Object.freeze([
	{ path: "404.html", language: FALLBACK_LANGUAGE },
	...LANGUAGES.map((entry) => ({ path: `${entry.language}/404.html`, language: entry.language })),
])

/** A Not-found page is not a Language home: it asks not to be indexed and advertises nothing. */
function checkNotIndexed(file: BuiltFile): readonly BuildFailure[] {
	const page = scanHtml(file.content)
	const failures: BuildFailure[] = []
	const robots = elementsByTag(page, "meta").find(
		(meta) => meta.attributes["name"]?.toLowerCase() === "robots",
	)
	if (!/\bnoindex\b/i.test(robots?.attributes["content"] ?? "")) {
		failures.push(
			buildFailure("NOINDEX_MISSING", file.path, "is not marked noindex, so a crawler indexes it."),
		)
	}
	const links = elementsByTag(page, "link")
	if (links.some((link) => /\bcanonical\b/i.test(link.attributes["rel"] ?? ""))) {
		failures.push(buildFailure("NOT_FOUND_HAS_CANONICAL", file.path, "advertises a canonical URL."))
	}
	if (links.some((link) => link.attributes["hreflang"] !== undefined)) {
		failures.push(
			buildFailure("NOT_FOUND_HAS_HREFLANG", file.path, "advertises itself as a Language home."),
		)
	}
	return failures
}

/** Every Not-found page exists, speaks its Language, and stays out of every index. */
export function checkNotFoundPages(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return NOT_FOUND_PAGES.flatMap((page) => {
		const file = fileAt(files, page.path)
		if (file === undefined) {
			return [
				buildFailure(
					"NOT_FOUND_PAGE_MISSING",
					page.path,
					`the build produced no ${page.language} Not-found page, so a miss has no page there.`,
				),
			]
		}
		return [...checkDeclaredLanguage(file, page.language), ...checkNotIndexed(file)]
	})
}
