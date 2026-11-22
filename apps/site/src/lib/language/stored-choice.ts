import { cookieNamed } from "../cookies/cookie-header"
import type { Language } from "./language"
import { spokenLanguage } from "./languages"

/** The cookie the Language menu writes: the visitor's one choice, readable by every app on the origin. */
export const LANGUAGE_CHOICE_COOKIE = "traj_lang"

/** The cookie's one year, in seconds. */
export const LANGUAGE_CHOICE_MAX_AGE_SECONDS = 31_536_000

/** The Language the visitor's choice cookie names, or `undefined` when it names none the Site speaks. */
export function languageFromCookie(header: string | null): Language | undefined {
	const value = cookieNamed(header, LANGUAGE_CHOICE_COOKIE)
	return value === undefined ? undefined : spokenLanguage(value)
}

/** The `Set-Cookie` value that stores one Language for every app under the origin. */
export function languageChoiceCookie(language: Language): string {
	return `${LANGUAGE_CHOICE_COOKIE}=${language}; Path=/; Secure; SameSite=Lax; Max-Age=${LANGUAGE_CHOICE_MAX_AGE_SECONDS}`
}
