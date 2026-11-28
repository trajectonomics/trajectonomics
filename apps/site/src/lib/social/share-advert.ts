import type { Dictionary } from "../language/dictionary"
import type { Language } from "../language/language"
import { openJotDictionaryFor } from "../language/openjot-dictionary"
import { FI_DEMO_DATE, SITE_BRAND_NAME, SITE_ORIGIN } from "../site"
import { shortMonthYear } from "./share-date"

/** The media type every share sheet reads a large card's image as. */
export const SHARE_IMAGE_TYPE = "image/png"

/** The path one Language's share image is written to, relative to the Worker's assets root. */
export function shareImagePath(language: Language): string {
	return `og/${language}.png`
}

/** That path on the Site's own origin: the absolute form `og:image` and `twitter:image` need. */
export function absoluteShareImageUrl(language: Language): string {
	return `${SITE_ORIGIN}/${shareImagePath(language)}`
}

/** The path the OpenJot page's share image is written to, so its card is not the home's card. */
export function openJotShareImagePath(language: Language): string {
	return `og/openjot-${language}.png`
}

/** The OpenJot card's absolute URL, the form a share sheet fetches. */
export function absoluteOpenJotShareImageUrl(language: Language): string {
	return `${SITE_ORIGIN}/${openJotShareImagePath(language)}`
}

/**
 * What the home card shows, for a reader who cannot see it: the question, and the picture's answer.
 * The `free` label is capitalised on the picture and sits mid-sentence here, so it is lowercased;
 * Thai has no case, so its own label passes through unchanged.
 */
export function shareImageAlt(dictionary: Dictionary): string {
	const date = shortMonthYear(FI_DEMO_DATE, dictionary.shareMonths)
	const picture = dictionary.shareChartAlt
		.replaceAll("{date}", date)
		.replaceAll("{free}", dictionary.shareFreeLabel.toLowerCase())
	return `${SITE_BRAND_NAME} — ${dictionary.actionQuestion} ${picture}`
}

/** What the OpenJot card shows: the app's name, and its one-line summary. */
export function openJotShareImageAlt(language: Language): string {
	return `OpenJot — ${openJotDictionaryFor(language).description}`
}
