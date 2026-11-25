import { languagePages } from "../language/language-pages"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { builtLanguagePages } from "./language-pages"
import { checkDeclaredLanguage } from "./page-language"
import { pageUrl } from "./page-url"

/** The OpenJot page is built in every Language, declares it, and is where its one address will fetch it. */
export function checkOpenJotPages(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const built = builtLanguagePages(files)
	return languagePages()
		.filter((page) => page.kind === "openjot")
		.flatMap((page) => {
			const found = built.find(
				(candidate) =>
					candidate.page.kind === page.kind && candidate.page.language === page.language,
			)
			if (found === undefined) {
				return [
					buildFailure(
						"OPENJOT_PAGE_MISSING",
						pageUrl(page.buildFile),
						`the build produced no ${page.language} OpenJot page at ${pageUrl(page.buildFile)}.`,
					),
				]
			}
			return checkDeclaredLanguage(found.file, page.language)
		})
}
