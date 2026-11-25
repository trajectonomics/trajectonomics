import type { LanguagePage } from "../language/language-pages"
import { languagePages } from "../language/language-pages"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"

/** One built page with the config it was built from. */
export interface BuiltLanguagePage {
	readonly page: LanguagePage
	readonly file: BuiltFile
}

/** The pages the build actually produced, so a rule judges a page that is there and not one it expects. */
export function builtLanguagePages(files: readonly BuiltFile[]): readonly BuiltLanguagePage[] {
	return languagePages().flatMap((page) => {
		const file = fileAt(files, page.buildFile)
		return file === undefined ? [] : [Object.freeze({ page, file })]
	})
}
