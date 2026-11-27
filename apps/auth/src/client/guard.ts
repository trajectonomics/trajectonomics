import type { SessionResponse } from "../lib/api-types"
import type { Language } from "../lib/language"
import { getConsent, getSession } from "./auth"
import { currentPath, signInHref, welcomeHref } from "./navigation"

/** The signed-in person, or null after sending the browser to the sign-in page. */
export async function ensureSignedIn(language: Language): Promise<SessionResponse | null> {
	const session = await getSession()
	if (session !== null) return session
	window.location.replace(signInHref(language, currentPath()))
	return null
}

/** Whether the person has answered the marketing question; false after sending them to it. */
export async function ensureConsent(language: Language): Promise<boolean> {
	if ((await getConsent()) !== null) return true
	window.location.replace(welcomeHref(language, currentPath()))
	return false
}
