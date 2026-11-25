import type { Dictionary } from "../language/dictionary"
import type { Language } from "../language/language"
import type { ShareLockup } from "./lockup"
import { shareImagePath } from "./share-advert"
import type { ShareColours } from "./share-colours"
import { composeShareImage, HOST, type ShareImage } from "./share-compose"

export { HOST, type ShareImage } from "./share-compose"

/** The most a share image may weigh, in bytes, so a card is fetched by a crawler and not by a page. */
export const SHARE_IMAGE_MAX_BYTES = 100_000

/** Everything one Language's share image is composed from: its words, its colours, and the lockup. */
export interface ShareImageInput {
	readonly language: Language
	readonly dictionary: Dictionary
	readonly colours: ShareColours
	readonly lockup: ShareLockup
}

/**
 * One Language's home share image: the Theme's own colours, the Language's value statement and the host
 * under it, at the size every share sheet cuts a large card to.
 */
export function shareImage(input: ShareImageInput): ShareImage {
	return composeShareImage({
		language: input.language,
		languageName: input.dictionary.languageName,
		statement: input.dictionary.description,
		path: shareImagePath(input.language),
		host: HOST,
		colours: input.colours,
		lockup: input.lockup,
	})
}
