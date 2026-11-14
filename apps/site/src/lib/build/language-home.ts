import type { Language, LanguageEntry } from "../language/language"
import { LANGUAGES } from "../language/languages"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { checkDeclaredLanguage } from "./page-language"

/** The file a Language's home is built to: a directory index, so `/th` reaches `/th/`. */
export function languageHomeFile(language: Language): string {
	return `${language}/index.html`
}

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

/** Each Language has a home at its Locale URL, and that home declares the Language. */
export function checkLanguageHomes(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return LANGUAGES.flatMap((entry) => {
		const path = languageHomeFile(entry.language)
		const file = fileAt(files, path)
		if (file === undefined) {
			return [
				buildFailure(
					"LANGUAGE_HOME_MISSING",
					path,
					`the build produced no ${entry.language} home.`,
				),
			]
		}
		return checkDeclaredLanguage(file, entry.language)
	})
}
