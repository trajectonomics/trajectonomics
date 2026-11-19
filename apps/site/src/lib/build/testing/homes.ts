import { currentLanguageName, OWNER_WRITTEN_PLACEHOLDER } from "../../language/dictionary"
import type { Language, LanguageEntry } from "../../language/language"
import {
	LANGUAGES,
	languageChoiceLink,
	languageEntry,
	languageHomeFile,
	otherLanguages,
} from "../../language/languages"
import type { BuiltFile } from "../built-files"
import type { BuildFailure } from "../failures"
import { headOf } from "./head"
import { releaseStrip } from "./release"

/** One Language's entry, so a test names the Language it changes. */
export function entryAt(index: number): LanguageEntry {
	const entry = LANGUAGES[index]
	if (entry === undefined) throw new Error("the Site speaks too few Languages for this test")
	return entry
}

/**
 * The switcher a home must show: every Language in that Language's own name, the reading Language
 * first and marked current. The reading Language comes first, so a test can edit the other one after.
 */
export function switcher(language: Language): string {
	const entry = languageEntry(language)
	const current = `<a href="${languageChoiceLink(language)}" lang="${language}" aria-label="${currentLanguageName(entry.dictionary)}" aria-current="page">${entry.dictionary.languageName}</a>`
	const others = otherLanguages(language)
		.map((other) => {
			const href = languageChoiceLink(other.language)
			const code = other.language
			return `<a href="${href}" lang="${code}">${other.dictionary.languageName}</a>`
		})
		.join("")
	return `${current}${others}`
}

/** One Language's home, as the build must produce it, with a chosen nav and body. */
export function home(
	language: Language,
	body = `<p>${OWNER_WRITTEN_PLACEHOLDER}</p>`,
	nav = switcher(language),
): BuiltFile {
	return {
		path: languageHomeFile(language),
		content: `<html lang="${language}"><head>${headOf(language)}</head><body><nav>${nav}</nav><main>${body}</main><footer>${releaseStrip(language)}</footer></body></html>`,
	}
}

/** Every Language's home, with `page` standing in for the home at the same path. */
export function homes(page?: BuiltFile): readonly BuiltFile[] {
	return LANGUAGES.map((entry) => {
		const built = home(entry.language)
		return page?.path === built.path ? page : built
	})
}

/** The same home with one part of its markup replaced. */
export function edited(language: Language, pattern: RegExp, replacement: string): BuiltFile {
	const built = home(language)
	return { path: built.path, content: built.content.replace(pattern, replacement) }
}

/** The failure codes one check reports for the built homes, with `page` standing in for one. */
export function codes(
	check: (files: readonly BuiltFile[]) => readonly BuildFailure[],
	page?: BuiltFile,
): readonly string[] {
	return check(homes(page)).map((failure) => failure.code)
}
