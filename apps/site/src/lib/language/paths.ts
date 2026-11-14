import { LANGUAGES } from "./languages"

/** The props a Language page is built with: the Language of its Locale URL. */
export interface LanguagePageProps {
	readonly language: string
}

/** One route the build produces for a Language page. */
export interface LanguagePath {
	readonly params: { readonly lang: string }
	readonly props: LanguagePageProps
}

/** The routes a Language page is built for, so a further Language needs no page edit. */
export function languagePaths(): readonly LanguagePath[] {
	return LANGUAGES.map((entry) => ({
		params: { lang: entry.language },
		props: { language: entry.language },
	}))
}
