import { FALLBACK_LANGUAGE } from "./language"
import { LANGUAGES } from "./languages"

/** The props a Language home is built with: the Language whose words it states. */
export interface LanguagePageProps {
	readonly language: string
}

/** One route the build produces for a Language home beyond the address. */
export interface LanguagePath {
	readonly params: { readonly lang: string }
	readonly props: LanguagePageProps
}

/**
 * The routes a Language home is built for besides the Site's address: every Language but the
 * fallback, which the build writes to the assets root instead.
 */
export function languagePaths(): readonly LanguagePath[] {
	return LANGUAGES.filter((entry) => entry.language !== FALLBACK_LANGUAGE).map((entry) => ({
		params: { lang: entry.language },
		props: { language: entry.language },
	}))
}
