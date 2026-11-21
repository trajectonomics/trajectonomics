import type { Dictionary } from "../language/dictionary"
import type { Language } from "../language/language"
import { SITE_NAME, SITE_ORIGIN } from "../site"

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

/** What the image shows, for a reader who cannot see it: the wordmark, and the value statement. */
export function shareImageAlt(dictionary: Dictionary): string {
	return `${SITE_NAME} — ${dictionary.description}`
}
