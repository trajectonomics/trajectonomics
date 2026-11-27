import type { Dictionary } from "./dictionary"
import { ENGLISH_ACCOUNT } from "./dictionary-en-account"
import { ENGLISH_LEGAL } from "./dictionary-en-legal"
import { ENGLISH_PAGES } from "./dictionary-en-pages"

/** English: the language of the root tree, and the official text of the legal pages. */
export const ENGLISH: Dictionary = Object.freeze({
	...ENGLISH_PAGES,
	...ENGLISH_ACCOUNT,
	...ENGLISH_LEGAL,
})
