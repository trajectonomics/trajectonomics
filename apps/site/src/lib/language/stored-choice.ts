import type { Language } from "./language"
import { spokenLanguage } from "./languages"

/** The cookie the Language menu writes: the visitor's one choice, readable by every app on the origin. */
export const LANGUAGE_CHOICE_COOKIE = "traj_lang"

/** The cookie's one year, in seconds. */
export const LANGUAGE_CHOICE_MAX_AGE_SECONDS = 31_536_000

/** One cookie, split into its name and the value before any parameter. */
interface Cookie {
	readonly name: string
	readonly value: string
}

/** Every cookie the `Cookie` header carries, in the order it was sent. */
function cookiesOf(header: string): readonly Cookie[] {
	return header.split(";").flatMap((part) => {
		const [rawName = "", ...rest] = part.split("=")
		const name = rawName.trim()
		if (name.length === 0) return []
		return [{ name, value: rest.join("=").trim() }]
	})
}

/** The Language the visitor's choice cookie names, or `undefined` when it names none the Site speaks. */
export function languageFromCookie(header: string | null): Language | undefined {
	if (header === null) return undefined
	const cookie = cookiesOf(header).find((one) => one.name === LANGUAGE_CHOICE_COOKIE)
	return cookie === undefined ? undefined : spokenLanguage(cookie.value)
}

/** The `Set-Cookie` value that stores one Language for every app under the origin. */
export function languageChoiceCookie(language: Language): string {
	return `${LANGUAGE_CHOICE_COOKIE}=${language}; Path=/; Secure; SameSite=Lax; Max-Age=${LANGUAGE_CHOICE_MAX_AGE_SECONDS}`
}
