import type { Dictionary } from "./dictionary"
import { THAI_ACCOUNT } from "./dictionary-th-account"
import { THAI_LEGAL } from "./dictionary-th-legal"
import { THAI_PAGES } from "./dictionary-th-pages"

/** Thai: the tree under `/th/`. The legal pages state that the English text is official. */
export const THAI: Dictionary = Object.freeze({
	...THAI_PAGES,
	...THAI_ACCOUNT,
	...THAI_LEGAL,
})
