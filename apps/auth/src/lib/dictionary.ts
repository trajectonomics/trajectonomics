import type { AccountWords } from "./dictionary-account"
import { ENGLISH } from "./dictionary-en"
import type { FrameWords } from "./dictionary-frame"
import type { PageWords } from "./dictionary-pages"
import { THAI } from "./dictionary-th"
import type { Language } from "./language"

/**
 * Every string one language shows. Every language has the same keys, so a page can never be
 * better in one language than the other (`dictionary.test.ts` fails a missing key).
 */
export interface Dictionary extends FrameWords, PageWords, AccountWords {}

/** The dictionary of each language, frozen so a page cannot edit another language's words. */
export const DICTIONARIES: Readonly<Record<Language, Dictionary>> = Object.freeze({
	en: ENGLISH,
	th: THAI,
})
