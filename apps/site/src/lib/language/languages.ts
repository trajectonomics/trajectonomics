import { SITE_ORIGIN } from "../site"
import type { Dictionary } from "./dictionary"
import { ENGLISH } from "./en"
import { type Language, type LanguageEntry, languageError } from "./language"
import { THAI } from "./th"

/** Every Language the Site speaks. A further Language is one Dictionary file and one entry here. */
export const LANGUAGES: readonly LanguageEntry[] = Object.freeze([THAI, ENGLISH])

/** The config entry of one Language. */
export function languageEntry(language: Language): LanguageEntry {
	const entry = LANGUAGES.find((candidate) => candidate.language === language)
	if (entry === undefined) throw languageError("language")
	return entry
}

/** The Dictionary of one Language. */
export function dictionaryFor(language: Language): Dictionary {
	return languageEntry(language).dictionary
}

/** Every Language except `language`, in the order the switcher lists them. */
export function otherLanguages(language: Language): readonly LanguageEntry[] {
	const own = languageEntry(language)
	return Object.freeze(LANGUAGES.filter((entry) => entry.language !== own.language))
}

/** The Locale URL of a Language's home, such as `/th/`; the form a `Location` and an `href` take. */
export function localeUrl(language: Language): string {
	return `${languageEntry(language).pathPrefix}/`
}

/** That Locale URL on the Site's own origin, the absolute form `hreflang` and canonical need. */
export function absoluteLocaleUrl(language: Language): string {
	return `${SITE_ORIGIN}${localeUrl(language)}`
}
