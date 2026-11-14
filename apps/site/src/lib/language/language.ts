import type { Dictionary } from "./dictionary"

/** The code of a Language the Site speaks, such as `th`. Every code is an entry in `LANGUAGES`. */
export type Language = string

/** The Language served at `/` when the Visitor signal chooses none. */
export const FALLBACK_LANGUAGE: Language = "en"

/** One Language: the path prefix of its Locale URLs, its countries, and its Dictionary. */
export interface LanguageEntry {
	readonly language: Language
	readonly pathPrefix: string
	readonly countries: readonly string[]
	readonly dictionary: Dictionary
}

/** The ways a Language lookup can be rejected. One code per rule. */
export type LanguageErrorCode = "LANGUAGE_UNKNOWN"

/** A rejected Language lookup: the Site speaks no Language by that code. */
export interface LanguageError extends Error {
	readonly code: LanguageErrorCode
	readonly field: string
}

/** The rejection of a code the Site does not speak; `field` is the caller's own input name. */
export function languageError(field: string): LanguageError {
	return Object.freeze(
		Object.assign(new Error(`the Site speaks no Language in ${field}`), {
			code: "LANGUAGE_UNKNOWN" as const,
			field,
		}),
	)
}
