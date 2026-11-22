import {
	type ConsentSignals,
	type ConsentState,
	consentChoiceFrom,
	consentCookies,
	cookieDomainFor,
	visitorCookie,
	visitorIdFrom,
} from "../lib/analytics/consent"
import { CLEAN_URL } from "../lib/language/languages"
import { bodyOf } from "./response-body"

/** Where a fresh visitor id comes from. A test passes a fixed one; the Worker uses a random UUID. */
export type IdSource = () => string

/** The choice answer is a redirect that stores state, so no cache may keep it. */
const CHOICE_CACHE_CONTROL = "no-store"

/** The status the choice answer gives: back to the address, with the choice stored. */
const CHOICE_STATUS = 302

/**
 * The validators and the length a personalised home drops. The same asset bytes now answer two ways,
 * so a 304 could hand a browser the cached variant with the banner, and a stale length would name
 * the wrong bytes.
 */
export const PERSONALISED_DROPPED_HEADERS: readonly string[] = Object.freeze([
	"ETag",
	"Last-Modified",
	"Content-Length",
])

/** The request headers consent is read from. */
export function signalsOf(request: Request): ConsentSignals {
	return {
		cookieHeader: request.headers.get("cookie"),
		secGpc: request.headers.get("sec-gpc"),
		dnt: request.headers.get("dnt"),
	}
}

/**
 * The consent answer: store the visitor's choice, then return to `/` without the banner. A grant keeps
 * the visitor's own valid id, and mints one only when there is none. An unknown value stores nothing.
 */
export function consentResponse(request: Request, value: string | null, newId: IdSource): Response {
	const choice = consentChoiceFrom(value)
	const headers = new Headers({ Location: CLEAN_URL, "Cache-Control": CHOICE_CACHE_CONTROL })
	if (choice !== undefined) {
		// The id is read from the cookie itself, not from the resolved state: a visitor whose browser
		// sends `Sec-GPC` resolves to `denied` but keeps the id they already hold.
		const visitorId = visitorIdFrom(request.headers.get("cookie")) ?? newId()
		const domain = cookieDomainFor(new URL(request.url).hostname)
		for (const cookie of consentCookies(choice, visitorId, domain)) {
			headers.append("Set-Cookie", cookie)
		}
	}
	return new Response(null, { status: CHOICE_STATUS, headers })
}

/**
 * The home for a visitor with an answer: the same bytes with `data-consent` (and `data-visitor` for a
 * grant) on the `html` element, so the page hides the banner and the analytics script knows the id.
 * The Worker mints the id, and writes its cookie, when a grant arrives without a valid one.
 */
export async function personalisedHome(
	request: Request,
	assetResponse: Response,
	headers: Headers,
	state: Exclude<ConsentState, { kind: "undecided" }>,
	newId: IdSource,
): Promise<Response> {
	const visitorId = state.kind === "granted" ? (state.visitorId ?? newId()) : undefined
	if (state.kind === "granted" && state.visitorId === undefined && visitorId !== undefined) {
		headers.append(
			"Set-Cookie",
			visitorCookie(visitorId, cookieDomainFor(new URL(request.url).hostname)),
		)
	}
	const body = bodyOf(request, assetResponse)
	if (body === null) {
		return new Response(null, { status: assetResponse.status, headers })
	}
	const rewriter = new HTMLRewriter().on("html", {
		element(element) {
			element.setAttribute("data-consent", state.kind)
			if (visitorId !== undefined) element.setAttribute("data-visitor", visitorId)
		},
	})
	const rewritten = rewriter.transform(new Response(body, { status: assetResponse.status }))
	return new Response(rewritten.body, { status: assetResponse.status, headers })
}
