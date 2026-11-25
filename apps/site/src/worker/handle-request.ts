import { CONSENT_PARAM, consentFromRequest } from "../lib/analytics/consent"
import { chooseLanguage } from "../lib/language/choose"
import { LANGUAGE_CHOICE_PARAM } from "../lib/language/languages"
import { languageFromCookie } from "../lib/language/stored-choice"
import { OPENJOT_PATH } from "../lib/site/openjot"
import {
	consentResponse,
	type IdSource,
	PERSONALISED_DROPPED_HEADERS,
	personalisedHome,
	signalsOf,
} from "./consent-answer"
import {
	choiceResponse,
	isOldAddress,
	movedToAddress,
	type PageAddress,
	pageAt,
	trailingSlashResponse,
} from "./page-address"
import { bodyOf } from "./response-body"

/** What the answer at a page address depends on, in the order the response names them. */
const VARY = "Cookie, Accept-Language, CF-IPCountry, Sec-GPC, DNT"

/** A page is private, so no shared cache hands one visitor's Language to another, and revalidated. */
const PAGE_CACHE_CONTROL = "private, no-cache"

/** The assets binding the Worker hands every path but its pages and the old prefixes back to. */
export interface Assets {
	fetch(request: Request): Promise<Response>
}

/** The conditional headers a revalidation carries, so a 304 describes the bytes it stands for. */
function conditionalHeaders(request: Request): Headers {
	const headers = new Headers()
	for (const name of ["If-None-Match", "If-Modified-Since"]) {
		const value = request.headers.get(name)
		if (value !== null) headers.set(name, value)
	}
	return headers
}

/** The answer at one page address: the resolved Language's page, with what the answer depends on. */
async function pageResponse(
	request: Request,
	assets: Assets,
	newId: IdSource,
	page: PageAddress,
): Promise<Response> {
	const url = new URL(request.url)
	const state = consentFromRequest(signalsOf(request))
	const language = chooseLanguage(
		languageFromCookie(request.headers.get("cookie")),
		request.headers.get("accept-language"),
		request.headers.get("cf-ipcountry"),
	)
	const decided = state.kind !== "undecided"
	const assetRequest = new Request(new URL(page.assetPath(language), url.origin), {
		method: "GET",
		headers: decided ? new Headers() : conditionalHeaders(request),
	})
	const assetResponse = await assets.fetch(assetRequest)
	const headers = new Headers(assetResponse.headers)
	headers.set("Vary", VARY)
	headers.set("Cache-Control", PAGE_CACHE_CONTROL)
	if (!decided) {
		return new Response(bodyOf(request, assetResponse), { status: assetResponse.status, headers })
	}
	for (const name of PERSONALISED_DROPPED_HEADERS) headers.delete(name)
	return personalisedHome(request, assetResponse, headers, state, newId)
}

/**
 * Answer each page address, the Language choice link, the consent link and the old prefixes, and hand
 * every other path to assets. `newId` mints a visitor id; a test passes a fixed one.
 */
export function handleRequest(
	request: Request,
	assets: Assets,
	newId: IdSource = () => crypto.randomUUID(),
): Promise<Response> {
	const url = new URL(request.url)
	if (isOldAddress(url.pathname)) return Promise.resolve(movedToAddress())
	const page = pageAt(url.pathname)
	if (page === undefined) {
		if (url.pathname === OPENJOT_PATH.slice(0, -1)) {
			return Promise.resolve(trailingSlashResponse(url))
		}
		return assets.fetch(request)
	}
	if (url.searchParams.has(LANGUAGE_CHOICE_PARAM)) {
		return Promise.resolve(
			choiceResponse(page.address, url.searchParams.get(LANGUAGE_CHOICE_PARAM)),
		)
	}
	if (url.searchParams.has(CONSENT_PARAM)) {
		return Promise.resolve(
			consentResponse(request, url.searchParams.get(CONSENT_PARAM), newId, page.address),
		)
	}
	return pageResponse(request, assets, newId, page)
}
