import { ABSOLUTE_OPENJOT_URL, OPENJOT_PATH } from "../site/openjot"
import {
	absoluteOpenJotShareImageUrl,
	absoluteShareImageUrl,
	openJotShareImageAlt,
	shareImageAlt,
} from "../social/share-advert"
import type { Language } from "./language"
import {
	ABSOLUTE_CLEAN_URL,
	CLEAN_URL,
	LANGUAGES,
	languageEntry,
	languageHomeFile,
} from "./languages"
import { OPENJOT_LANGUAGES, openJotBuildFile, openJotDictionaryFor } from "./openjot-dictionary"

/** The two pages the Site builds in every Language: its home at `/`, and OpenJot at `/openjot/`. */
export type PageKind = "home" | "openjot"

/** One page of the Site, in one Language: where it is built, what it states and which card it advertises. */
export interface LanguagePage {
	readonly kind: PageKind
	readonly language: Language
	/** The one address a visitor reaches it at. */
	readonly address: string
	/** That address on the Site's own origin. */
	readonly absoluteUrl: string
	/** The built file, relative to the assets root. */
	readonly buildFile: string
	readonly documentTitle: string
	readonly description: string
	readonly locale: string
	readonly shareImageUrl: string
	readonly shareImageAlt: string
}

/** The Site's home in one Language. */
function homePage(language: Language): LanguagePage {
	const entry = languageEntry(language)
	return Object.freeze({
		kind: "home",
		language,
		address: CLEAN_URL,
		absoluteUrl: ABSOLUTE_CLEAN_URL,
		buildFile: languageHomeFile(language),
		documentTitle: entry.dictionary.documentTitle,
		description: entry.dictionary.description,
		locale: entry.locale,
		shareImageUrl: absoluteShareImageUrl(language),
		shareImageAlt: shareImageAlt(entry.dictionary),
	})
}

/** The OpenJot page in one Language. */
function openJotPage(language: Language): LanguagePage {
	const dictionary = openJotDictionaryFor(language)
	return Object.freeze({
		kind: "openjot",
		language,
		address: OPENJOT_PATH,
		absoluteUrl: ABSOLUTE_OPENJOT_URL,
		buildFile: openJotBuildFile(language),
		documentTitle: dictionary.documentTitle,
		description: dictionary.description,
		locale: languageEntry(language).locale,
		shareImageUrl: absoluteOpenJotShareImageUrl(language),
		shareImageAlt: openJotShareImageAlt(language),
	})
}

/** Every page the Site builds: its homes first, then each Language's OpenJot page. */
export function languagePages(): readonly LanguagePage[] {
	return Object.freeze([
		...LANGUAGES.map((entry) => homePage(entry.language)),
		...OPENJOT_LANGUAGES.map((entry) => openJotPage(entry.language)),
	])
}
