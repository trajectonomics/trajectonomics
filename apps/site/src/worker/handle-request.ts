import { chooseLanguage } from "../lib/language/choose"
import {
	CLEAN_URL,
	LANGUAGE_CHOICE_PARAM,
	LANGUAGES,
	languageHomePath,
	spokenLanguage,
} from "../lib/language/languages"
import { languageChoiceCookie, languageFromCookie } from "../lib/language/stored-choice"

/** The one path the Worker answers itself; every other path is a static asset (ADR 0020). */
const ROOT_PATH = CLEAN_URL

/** The prefixes the Site answered at before it had one address: one per Language the Site speaks. */
const OLD_PREFIXES: readonly string[] = Object.freeze(
	LANGUAGES.map((entry) => `/${entry.language}`),
)

/** What the answer at `/` depends on, in the order the response names them. */
const VARY = "Cookie, Accept-Language, CF-IPCountry"

/** `/` is private, so no shared cache hands one visitor's Language to another, and revalidated. */
const HOME_CACHE_CONTROL = "private, no-cache"

/** The choice answer is a redirect that stores state, so no cache may keep it. */
const CHOICE_CACHE_CONTROL = "no-store"

/** The status an old prefix answers with: permanent, because the address will not move back. */
const MOVED_STATUS = 301

/** The status the choice answer gives: back to the address, with the choice stored. */
const CHOICE_STATUS = 302

/** The assets binding the Worker hands every path but `/` and the old prefixes back to. */
export interface Assets {
	fetch(request: Request): Promise<Response>
}

/** Whether a path is one the Site answered at before it had one address. */
function isOldAddress(pathname: string): boolean {
	return OLD_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** The 301 every old prefix answers, so an indexed URL never 404s. */
function movedToAddress(): Response {
	return new Response(null, {
		status: MOVED_STATUS,
		headers: { Location: CLEAN_URL },
	})
}

/** The choice answer: store a Language the Site speaks, then return to `/`. */
function choiceResponse(choice: string | null): Response {
	const language = spokenLanguage(choice)
	const headers = new Headers({ Location: CLEAN_URL, "Cache-Control": CHOICE_CACHE_CONTROL })
	if (language !== undefined) headers.set("Set-Cookie", languageChoiceCookie(language))
	return new Response(null, { status: CHOICE_STATUS, headers })
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

/** The body to send: none for a HEAD, a 304 or a 204, and the assets' own bytes otherwise. */
function bodyOf(request: Request, response: Response): ReadableStream<Uint8Array> | null {
	if (request.method === "HEAD" || response.status === 304 || response.status === 204) return null
	return response.body
}

/** The answer at `/`: the resolved Language's home, with what the answer depends on. */
async function homeResponse(request: Request, assets: Assets): Promise<Response> {
	const url = new URL(request.url)
	const language = chooseLanguage(
		languageFromCookie(request.headers.get("cookie")),
		request.headers.get("accept-language"),
		request.headers.get("cf-ipcountry"),
	)
	const assetRequest = new Request(new URL(languageHomePath(language), url.origin), {
		method: "GET",
		headers: conditionalHeaders(request),
	})
	const assetResponse = await assets.fetch(assetRequest)
	const headers = new Headers(assetResponse.headers)
	headers.set("Vary", VARY)
	headers.set("Cache-Control", HOME_CACHE_CONTROL)
	return new Response(bodyOf(request, assetResponse), { status: assetResponse.status, headers })
}

/** Answer the address, the choice link and the old prefixes, and hand every other path to assets. */
export function handleRequest(request: Request, assets: Assets): Promise<Response> {
	const url = new URL(request.url)
	if (isOldAddress(url.pathname)) return Promise.resolve(movedToAddress())
	if (url.pathname !== ROOT_PATH) return assets.fetch(request)
	if (url.searchParams.has(LANGUAGE_CHOICE_PARAM)) {
		return Promise.resolve(choiceResponse(url.searchParams.get(LANGUAGE_CHOICE_PARAM)))
	}
	return homeResponse(request, assets)
}
