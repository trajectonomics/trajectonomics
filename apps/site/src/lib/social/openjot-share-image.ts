import type { Language } from "../language/language"
import { languageEntry } from "../language/languages"
import type { OpenJotDictionary } from "../language/openjot-dictionary"
import { OPENJOT_PATH } from "../site/openjot"
import type { ShareLockup } from "./lockup"
import { openJotShareImagePath } from "./share-advert"
import type { ShareColours } from "./share-colours"
import { composeShareImage, HOST, type ShareImage } from "./share-compose"

/** Everything the OpenJot card is composed from: its words, its colours, and the lockup. */
export interface OpenJotShareImageInput {
	readonly language: Language
	readonly dictionary: OpenJotDictionary
	readonly colours: ShareColours
	readonly lockup: ShareLockup
}

/** The OpenJot page's card: the app's one-line summary, under the Site's own lockup and host. */
export function openJotShareImage(input: OpenJotShareImageInput): ShareImage {
	return composeShareImage({
		language: input.language,
		languageName: languageEntry(input.language).dictionary.languageName,
		statement: input.dictionary.description,
		path: openJotShareImagePath(input.language),
		host: `${HOST}${OPENJOT_PATH}`.replace(/\/$/, ""),
		colours: input.colours,
		lockup: input.lockup,
	})
}
