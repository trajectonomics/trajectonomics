import { type LanguageTag, parseAcceptLanguage } from "./accept-language"
import { FALLBACK_LANGUAGE, type Language } from "./language"
import { LANGUAGES } from "./languages"

/** The Language the best positive tag names; a higher quality wins, the first listed tag a tie. */
function languageByQuality(tags: readonly LanguageTag[]): Language | undefined {
	let best: { readonly language: Language; readonly quality: number } | undefined
	for (const tag of tags) {
		if (tag.quality <= 0) continue
		const entry = LANGUAGES.find((candidate) => candidate.language === tag.subtag)
		if (entry === undefined) continue
		if (best === undefined || tag.quality > best.quality) {
			best = { language: entry.language, quality: tag.quality }
		}
	}
	return best?.language
}

/** The Language a country chooses, unless a tag rejects that Language outright. */
function languageByCountry(
	tags: readonly LanguageTag[],
	country: string | null,
): Language | undefined {
	const code = country?.trim().toUpperCase()
	if (code === undefined || code.length === 0) return undefined
	const entry = LANGUAGES.find((candidate) => candidate.countries.includes(code))
	if (entry === undefined) return undefined
	const rejected = tags.some((tag) => tag.subtag === entry.language && tag.quality <= 0)
	return rejected ? undefined : entry.language
}

/** The Language `/` redirects to: the best tag, else the country, else English. No I/O, no clock. */
export function chooseLanguage(acceptLanguage: string | null, country: string | null): Language {
	const tags = parseAcceptLanguage(acceptLanguage)
	return languageByQuality(tags) ?? languageByCountry(tags, country) ?? FALLBACK_LANGUAGE
}
