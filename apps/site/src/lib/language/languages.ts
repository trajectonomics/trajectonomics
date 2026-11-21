import { SITE_ORIGIN } from "../site"
import type { Dictionary } from "./dictionary"
import { ENGLISH } from "./en"
import { type Language, type LanguageEntry, languageError } from "./language"
import { THAI } from "./th"

/** Every Language the Site speaks. A further Language is one Dictionary file and one entry here. */
export const LANGUAGES: readonly LanguageEntry[] = Object.freeze([THAI, ENGLISH])

/** The Site's one address: every Language's home answers here, and every page states it. */
export const CLEAN_URL = "/"

/** That address on the Site's own origin, the absolute form canonical and `x-default` need. */
export const ABSOLUTE_CLEAN_URL = `${SITE_ORIGIN}${CLEAN_URL}`

/** The query parameter a Language menu entry carries its choice in. */
export const LANGUAGE_CHOICE_PARAM = "lang"

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

/** The Language a code names, or `undefined` when the Site does not speak it. */
export function spokenLanguage(code: string | null | undefined): Language | undefined {
	const value = code?.trim().toLowerCase()
	if (value === undefined || value.length === 0) return undefined
	return LANGUAGES.find((entry) => entry.language === value)?.language
}

/** The asset path one Language's home is built at, relative to the assets root. */
export function languageHomePath(language: Language): string {
	const { buildPath } = languageEntry(language)
	return buildPath === "" ? CLEAN_URL : `/${buildPath}/`
}

/** The built file one Language's home is written to, relative to the assets root. */
export function languageHomeFile(language: Language): string {
	const { buildPath } = languageEntry(language)
	return buildPath === "" ? "index.html" : `${buildPath}/index.html`
}

/**
 * One Language's home as an absolute URL, under its build path. The fallback Language's build path is
 * the assets root, so its URL is the Site's address; a caller that forbids a build path must skip it
 * and use `languageEntry(language).buildPath !== ""` to tell the two apart. Derived rather than
 * written out, so such a rule keeps working after a build path is renamed.
 */
export function languageBuildUrl(language: Language): string {
	return `${SITE_ORIGIN}${languageHomePath(language)}`
}

/** The Language choice link: it stores one Language as the visitor's choice, then returns to the address. */
export function languageChoiceLink(language: Language): string {
	return `${CLEAN_URL}?${LANGUAGE_CHOICE_PARAM}=${encodeURIComponent(language)}`
}
