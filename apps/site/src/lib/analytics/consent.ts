import { cookieNamed } from "../cookies/cookie-header"

/**
 * The visitor's answer to the cookie banner, and the cookies that store it.
 *
 * The Worker resolves the answer from the request, as it resolves the Language
 * ([ADR 0024](../../../docs/adr/0024-the-site-asks-before-it-sets-an-analytics-cookie.md)): the page
 * script never reads a cookie, so the banner is never shown after a choice and never flashes before one.
 */

/** The cookie that stores the visitor's answer: `granted` or `denied`. */
export const CONSENT_COOKIE = "traj_consent"

/** The cookie that holds the random visitor id, once the visitor has granted consent. */
export const VISITOR_COOKIE = "traj_vid"

/** The query parameter a banner link or the footer link carries its choice in. */
export const CONSENT_PARAM = "consent"

/**
 * The consent cookies' lifetime: 180 days. The question is asked again after six months, so a visitor
 * who agreed long ago is not counted by a choice they no longer remember making.
 */
export const CONSENT_MAX_AGE_SECONDS = 15_552_000

/** The two answers a visitor can give the banner. */
export type ConsentChoice = "granted" | "denied"

/**
 * What the request says about consent. `denied` also covers a browser-wide opt-out, because the
 * visitor has already answered "no" for every site; the banner is not shown to them.
 */
export type ConsentState =
	| { readonly kind: "granted"; readonly visitorId: string | undefined }
	| { readonly kind: "denied" }
	| { readonly kind: "undecided" }

/** The inputs consent is read from: the request's `Cookie`, `Sec-GPC` and `DNT` headers. */
export interface ConsentSignals {
	readonly cookieHeader: string | null
	readonly secGpc: string | null
	readonly dnt: string | null
}

/**
 * A strict lowercase UUID. Anything else is refused, so a hostile cookie value can never be written
 * into the page's attributes or the event's `distinct_id`.
 */
const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** The attributes every consent cookie carries; `Secure` is what keeps them off plain HTTP. */
const COOKIE_ATTRIBUTES = "Path=/; Secure; SameSite=Lax"

/** Whether a value is a visitor id this Site issued: a strict lowercase UUID. */
export function isVisitorId(value: string | undefined): value is string {
	return value !== undefined && VISITOR_ID.test(value)
}

/** The visitor id the request carries, or `undefined` when it carries none or an invalid one. */
export function visitorIdFrom(cookieHeader: string | null): string | undefined {
	const value = cookieNamed(cookieHeader, VISITOR_COOKIE)
	return isVisitorId(value) ? value : undefined
}

/**
 * The consent state a request states. A browser-wide opt-out wins over any stored answer; a stored
 * `granted` keeps the visitor id only when it is valid.
 */
export function consentFromRequest(signals: ConsentSignals): ConsentState {
	if (signals.secGpc === "1" || signals.dnt === "1") return { kind: "denied" }
	const stored = cookieNamed(signals.cookieHeader, CONSENT_COOKIE)
	if (stored === "granted") {
		return { kind: "granted", visitorId: visitorIdFrom(signals.cookieHeader) }
	}
	if (stored === "denied") return { kind: "denied" }
	return { kind: "undecided" }
}

/** The `Set-Cookie` value of the visitor id: readable by the Docs Portal, so not `HttpOnly`. */
export function visitorCookie(visitorId: string): string {
	return `${VISITOR_COOKIE}=${visitorId}; ${COOKIE_ATTRIBUTES}; Max-Age=${CONSENT_MAX_AGE_SECONDS}`
}

/**
 * The `Set-Cookie` values one choice writes. `granted` stores the answer and the id; `denied` stores
 * the answer and clears the id; `reset` clears both, so the banner is asked again. The id is read only
 * for `granted`.
 */
export function consentCookies(
	choice: ConsentChoice | "reset",
	visitorId: string,
): readonly string[] {
	if (choice === "granted") {
		return [
			`${CONSENT_COOKIE}=granted; ${COOKIE_ATTRIBUTES}; Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
			visitorCookie(visitorId),
		]
	}
	if (choice === "denied") {
		return [
			`${CONSENT_COOKIE}=denied; ${COOKIE_ATTRIBUTES}; Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
			`${VISITOR_COOKIE}=; ${COOKIE_ATTRIBUTES}; Max-Age=0`,
		]
	}
	return [
		`${CONSENT_COOKIE}=; ${COOKIE_ATTRIBUTES}; Max-Age=0`,
		`${VISITOR_COOKIE}=; ${COOKIE_ATTRIBUTES}; Max-Age=0`,
	]
}

/** The choice a `?consent=` value names, or `undefined` when it names none the Site offers. */
export function consentChoiceFrom(param: string | null): ConsentChoice | "reset" | undefined {
	if (param === "granted" || param === "denied" || param === "reset") return param
	return undefined
}
