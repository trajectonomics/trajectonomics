import type { SessionResponse } from "../lib/api-types"
import type { Language } from "../lib/language"
import { getConsent, readSession } from "./auth"
import { currentPath, signInHref, welcomeHref } from "./navigation"

/** The signed-in person and the server's clock, from the session read that found them. */
export type SignedIn = {
	readonly session: SessionResponse
	/** The `Date` header of the get-session answer, or null when it is missing. */
	readonly serverNowMs: number | null
}

/** The signed-in person, or null after sending the browser to the sign-in page. */
export async function ensureSignedIn(language: Language): Promise<SignedIn | null> {
	const read = await readSession()
	if (read.session !== null) return { session: read.session, serverNowMs: read.serverNowMs }
	window.location.replace(signInHref(language, currentPath()))
	return null
}

/** Whether the person has answered the marketing question; false after sending them to it. */
export async function ensureConsent(language: Language): Promise<boolean> {
	if ((await getConsent()) !== null) return true
	window.location.replace(welcomeHref(language, currentPath()))
	return false
}
