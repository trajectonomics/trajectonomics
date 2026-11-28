import type { Dictionary } from "../language/dictionary"
import type { Language } from "../language/language"
import type { ShareLockup } from "./lockup"
import { shareImagePath } from "./share-advert"
import { composeShareChart } from "./share-chart"
import type { ShareColours } from "./share-colours"
import { HOST, type ShareImage } from "./share-compose"
import type { ShareMascot } from "./share-mascot"

export { HOST, type ShareImage } from "./share-compose"

/** The most a share image may weigh, in bytes, so a card is fetched by a crawler and not by a page. */
export const SHARE_IMAGE_MAX_BYTES = 100_000

/** Everything one Language's share image is composed from: its words, colours, lockup and mascot. */
export interface ShareImageInput {
	readonly language: Language
	readonly dictionary: Dictionary
	readonly colours: ShareColours
	readonly lockup: ShareLockup
	readonly mascot: ShareMascot
}

/**
 * One Language's home share image: the answer to its question drawn as a net-worth line, grey while
 * working and orange once free to stop, with the FI date written on the curve and the mascot standing
 * at the right margin pointing back at it. The OpenJot card keeps its own composition
 * (`openjot-share-image.ts`).
 */
export function shareImage(input: ShareImageInput): ShareImage {
	return composeShareChart({
		dictionary: input.dictionary,
		path: shareImagePath(input.language),
		host: HOST,
		colours: input.colours,
		lockup: input.lockup,
		mascot: input.mascot,
	})
}
