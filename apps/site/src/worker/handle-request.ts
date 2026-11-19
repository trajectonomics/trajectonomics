import { chooseLanguage } from "../lib/language/choose"
import { localeUrl } from "../lib/language/languages"

/** The one path the Worker answers itself; every other path is a static asset ([ADR 0003]). */
const ROOT_PATH = "/"

/** The Visitor signals a shared cache must vary on, in the order the response names them. */
const VARY = "Accept-Language, CF-IPCountry"

/** The assets binding the Worker hands every path but `/` back to. */
export interface Assets {
	fetch(request: Request): Promise<Response>
}

/** The redirect from `/`: a Locale URL with the query kept, which no cache may store. */
export function redirectFromRoot(url: URL, headers: Headers): Response {
	const language = chooseLanguage(headers.get("accept-language"), headers.get("cf-ipcountry"))
	return new Response(null, {
		status: 302,
		headers: {
			Location: `${localeUrl(language)}${url.search}`,
			Vary: VARY,
			"Cache-Control": "no-store",
		},
	})
}

/** Answer `/` with the redirect, and hand every other path to the assets binding. */
export function handleRequest(request: Request, assets: Assets): Promise<Response> {
	const url = new URL(request.url)
	if (url.pathname !== ROOT_PATH) return assets.fetch(request)
	return Promise.resolve(redirectFromRoot(url, request.headers))
}
