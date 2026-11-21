import type { LanguageEntry } from "../language/language"
import { LANGUAGES, languageHomeFile } from "../language/languages"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { checkDeclaredLanguage } from "./page-language"
import { pageUrl } from "./page-url"

export { languageHomeFile }

/** One Language's built home, with the entry it belongs to. */
export interface BuiltHome {
	readonly entry: LanguageEntry
	readonly file: BuiltFile
}

/** Every Language's built home. A home the build did not produce is left out, and says so. */
export function builtHomes(files: readonly BuiltFile[]): readonly BuiltHome[] {
	return LANGUAGES.flatMap((entry) => {
		const file = fileAt(files, languageHomeFile(entry.language))
		return file === undefined ? [] : [{ entry, file }]
	})
}

/**
 * The fallback Language's home is the Site's one address, and every other Language's home is a
 * build path: each declares the Language it answers in.
 */
export function checkLanguageHomes(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return LANGUAGES.flatMap((entry) => {
		const path = languageHomeFile(entry.language)
		const file = fileAt(files, path)
		if (file === undefined) {
			return [
				buildFailure(
					"LANGUAGE_PAGE_MISSING",
					pageUrl(path),
					`the build produced no ${entry.language} home at ${pageUrl(path)}.`,
				),
			]
		}
		return checkDeclaredLanguage(file, entry.language)
	})
}
