import { type Language, pagePath } from "../lib/language"
import { isSignedOAuthSearch } from "../lib/oauth-search"

/** The current address with its query, which a sign-in or first-sign-in step carries as `next`. */
export function currentPath(): string {
	return `${window.location.pathname}${window.location.search}`
}

/** The sign-in page, with the page to return to after a successful sign-in. */
export function signInHref(language: Language, from: string = currentPath()): string {
	return `${pagePath(language, "sign-in")}?next=${encodeURIComponent(from)}`
}

/** The first-sign-in question, with the page to continue to once it is answered. */
export function welcomeHref(language: Language, from: string = currentPath()): string {
	return `${pagePath(language, "welcome")}?next=${encodeURIComponent(from)}`
}

/**
 * The provider's authorize endpoint with the signed query the page carries. A passkey sign-in
 * sends no `oauth_query` of its own, so the page resumes the flow by navigating here; without a
 * signed query the person simply continues to `fallback`.
 */
export function authorizeHref(search: string, fallback: string): string {
	return isSignedOAuthSearch(search) ? `/api/auth/oauth2/authorize${search}` : fallback
}
