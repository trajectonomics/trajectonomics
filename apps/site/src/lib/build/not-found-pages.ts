import { FALLBACK_LANGUAGE, type Language } from "../language/language"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { checkNotFoundHead } from "./not-found-head"
import { checkDeclaredLanguage } from "./page-language"
import { pageUrl } from "./page-url"

/** One Not-found page the build must produce, and the Language it answers in. */
export interface NotFoundPage {
	readonly path: string
	readonly language: Language
}

/** One Not-found page answers every miss, in the fallback Language: a miss has no Language address. */
export const NOT_FOUND_PAGES: readonly NotFoundPage[] = Object.freeze([
	{ path: "404.html", language: FALLBACK_LANGUAGE },
])

/** The Not-found page exists, speaks its Language, and stays out of every index. */
export function checkNotFoundPages(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return NOT_FOUND_PAGES.flatMap((page) => {
		const file = fileAt(files, page.path)
		if (file === undefined) {
			return [
				buildFailure(
					"NOT_FOUND_PAGE_MISSING",
					pageUrl(page.path),
					`the build produced no ${page.language} Not-found page, so a miss has no page there.`,
				),
			]
		}
		return [...checkDeclaredLanguage(file, page.language), ...checkNotFoundHead(file)]
	})
}
