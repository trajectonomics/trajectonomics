import { acceptsMarkdown } from "./accepts-markdown"
import { legacyHostLocation } from "./legacy-host"
import { pageTwinPath } from "./page-twin-path"
import { retiredPathTarget } from "./retired-paths"

/** The Worker's assets binding: the built site, by request path. */
export interface AssetsBinding {
	readonly fetch: (request: Request) => Promise<Response>
}

/** The Markdown twin's response type and the header that keeps a cache from crossing the two forms. */
const MARKDOWN_TYPE = "text/markdown; charset=utf-8"
const VARY = "Accept"

/** A response with `Vary: Accept` added, keeping any variation the assets already declare. */
function varyOnAccept(response: Response): Response {
	const headers = new Headers(response.headers)
	const vary = headers.get("vary")
	const varies =
		vary
			?.toLowerCase()
			.split(",")
			.some((name) => name.trim() === "accept") ?? false
	if (!varies) headers.set("vary", vary === null ? VARY : `${vary}, ${VARY}`)
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

/** The twin request for a page request: the same origin and method, at the twin's path. */
function twinRequest(request: Request, twinPath: string): Request {
	const url = new URL(request.url)
	url.pathname = twinPath
	return new Request(url, { method: request.method })
}

/** A page's twin as the answer, typed as Markdown; a HEAD request carries the type and no body. */
function markdownResponse(request: Request, twin: Response): Response {
	const headers = new Headers({ "content-type": MARKDOWN_TYPE, vary: VARY })
	return new Response(request.method === "HEAD" ? null : twin.body, {
		status: twin.status,
		headers,
	})
}

/** A permanent redirect to `location`, for an old host or a retired path a reader still reaches. */
function permanentRedirect(location: string): Response {
	return new Response(null, { status: 301, headers: { location } })
}

/** Answer one request: the old host's redirect, a retired path's redirect, a page's Markdown twin when its client asks for it, the assets otherwise. */
export async function handleRequest(request: Request, assets: AssetsBinding): Promise<Response> {
	const read = request.method === "GET" || request.method === "HEAD"
	const url = new URL(request.url)
	const legacy = read ? legacyHostLocation(url) : null
	if (legacy !== null) return permanentRedirect(legacy)
	const { pathname } = url
	const retired = read ? retiredPathTarget(pathname) : null
	if (retired !== null) return permanentRedirect(retired)
	const twinPath = read ? pageTwinPath(pathname) : null
	if (twinPath === null) return assets.fetch(request)
	const twin = await assets.fetch(twinRequest(request, twinPath))
	if (twin.status !== 200) return assets.fetch(request)
	if (!acceptsMarkdown(request.headers.get("accept"))) {
		return varyOnAccept(await assets.fetch(request))
	}
	return markdownResponse(request, twin)
}
