import { DICTIONARIES, type Dictionary } from "./dictionary"

/** Every language the auth pages speak. English at `/`, Thai under `/th/`. */
export const LANGUAGES = Object.freeze(["en", "th"] as const)

/** One language the pages speak. */
export type Language = (typeof LANGUAGES)[number]

/** The language of the root tree, and the one the fallback page is written in. */
export const DEFAULT_LANGUAGE: Language = "en"

/** Every page that has both a language's address and a dictionary entry. */
export const PAGES = Object.freeze([
	"home",
	"sign-in",
	"welcome",
	"device",
	"consent",
	"account",
	"privacy",
	"terms",
] as const)

/** One page the auth origin serves. */
export type Page = (typeof PAGES)[number]

/** Whether a string names a language the pages speak. */
export function isLanguage(value: string): value is Language {
	return (LANGUAGES as readonly string[]).includes(value)
}

/** Whether a string names one of the pages. */
export function isPage(value: string): value is Page {
	return (PAGES as readonly string[]).includes(value)
}

/** The address of one page in one language: `/sign-in/` or `/th/sign-in/`. */
export function pagePath(language: Language, page: Page): string {
	if (page === "home") return language === DEFAULT_LANGUAGE ? "/" : `/${language}/`
	return `${language === DEFAULT_LANGUAGE ? "" : `/${language}`}/${page}/`
}

/** The language a path belongs to, read from its first segment. */
export function languageOf(pathname: string): Language {
	const first = pathname.replace(/^\//, "").split("/")[0] ?? ""
	return isLanguage(first) ? first : DEFAULT_LANGUAGE
}

/** The built Astro file of one page in one language, relative to `src/pages`. */
export function pageFile(language: Language, page: Page): string {
	const name = page === "home" ? "index" : page
	return language === DEFAULT_LANGUAGE ? `${name}.astro` : `${language}/${name}.astro`
}

/** The words of one language. */
export function dictionaryFor(language: Language): Dictionary {
	return DICTIONARIES[language]
}

/**
 * The header marker's words: the page's own name, so the bar never calls every page "Account".
 * The marker points at the page it names, which is where the person already is.
 */
export function pageLabel(page: Page, words: Dictionary): string {
	switch (page) {
		case "sign-in":
			return words.signInTitle
		case "welcome":
			return words.welcomeTitle
		case "device":
			return words.deviceTitle
		case "consent":
			return words.consentTitle
		case "account":
			return words.accountTitle
		case "privacy":
			return words.privacyTitle
		case "terms":
			return words.termsTitle
		case "home":
			return words.accountMarker
	}
}
