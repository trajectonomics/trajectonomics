import { OWNER_WRITTEN_PLACEHOLDER } from "../../language/dictionary"
import { FALLBACK_LANGUAGE, type Language, type LanguageEntry } from "../../language/language"
import {
	absoluteLocaleUrl,
	LANGUAGES,
	languageEntry,
	localeUrl,
	otherLanguages,
} from "../../language/languages"
import type { BuiltFile } from "../built-files"
import type { BuildFailure } from "../failures"

/** One Language's entry, so a test names the Language it changes. */
export function entryAt(index: number): LanguageEntry {
	const entry = LANGUAGES[index]
	if (entry === undefined) throw new Error("the Site speaks too few Languages for this test")
	return entry
}

/**
 * The switcher a home must show: the reading Language, marked current, and every other Language in
 * that Language's own name. The current link comes last, so a test can edit the other one first.
 */
export function switcher(language: Language): string {
	const others = otherLanguages(language)
		.map((other) => {
			const href = localeUrl(other.language)
			const code = other.language
			return `<a href="${href}" lang="${code}" hreflang="${code}">${other.dictionary.languageName}</a>`
		})
		.join("")
	const entry = languageEntry(language)
	return `${others}<a href="${localeUrl(language)}" lang="${language}" hreflang="${language}" aria-label="${entry.dictionary.languageName}" aria-current="page">${entry.dictionary.languageSwitchLabel}</a>`
}

/** The advertised links every home carries: one per Language, plus `x-default`. */
const ALTERNATES = [
	...LANGUAGES.map(
		(entry) =>
			`<link rel="alternate" hreflang="${entry.language}" href="${absoluteLocaleUrl(entry.language)}">`,
	),
	`<link rel="alternate" hreflang="x-default" href="${absoluteLocaleUrl(FALLBACK_LANGUAGE)}">`,
].join("")

/** One Language's home, as the build must produce it, with a chosen nav and body. */
export function home(
	language: Language,
	body = `<p>${OWNER_WRITTEN_PLACEHOLDER}</p>`,
	nav = switcher(language),
): BuiltFile {
	const canonical = `<link rel="canonical" href="${absoluteLocaleUrl(language)}">`
	return {
		path: `${language}/index.html`,
		content: `<html lang="${language}"><head>${canonical}${ALTERNATES}</head><body><nav>${nav}</nav><main>${body}</main></body></html>`,
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
