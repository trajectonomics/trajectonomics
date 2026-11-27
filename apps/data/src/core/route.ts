import { BASE_PATH, LEGACY_HOST, SITE_ORIGIN } from "./urls"

/** What the Worker answers for one request; `src/http/router.ts` turns it into a Response. */
export type Route =
	| { kind: "usage" }
	| { kind: "health" }
	| { kind: "ingest" }
	| { kind: "not_found" }
	| { kind: "redirect"; location: string }
	| { kind: "method_not_allowed"; allow: string }

/** The parts of a request that decide the route. Hostnames arrive lowercased from `URL`. */
export type RouteInput = {
	hostname: string
	pathname: string
	search: string
	method: string
}

function isUnderBase(pathname: string): boolean {
	return pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`)
}

/** The canonical page path of an old-host page: the base path, added once. */
function legacyTarget(pathname: string): string {
	const target = isUnderBase(pathname) ? pathname : `${BASE_PATH}${pathname}`
	return target === BASE_PATH ? `${BASE_PATH}/` : target
}

/**
 * The old host keeps the API and the ingest it always had: a redirect there would turn the
 * collector's POST into a GET. Every other GET or HEAD is a page, and answers a permanent
 * redirect to the same path under the apex's base path.
 */
function legacyRoute(input: RouteInput): Route {
	if (input.pathname === "/api/usage") return { kind: "usage" }
	if (input.pathname === "/api/health") return { kind: "health" }
	if (input.pathname.startsWith("/api/")) return { kind: "not_found" }
	if (input.pathname === "/ingest") return { kind: "ingest" }
	if (input.method !== "GET" && input.method !== "HEAD") {
		return { kind: "method_not_allowed", allow: "GET, HEAD" }
	}
	return {
		kind: "redirect",
		location: `${SITE_ORIGIN}${legacyTarget(input.pathname)}${input.search}`,
	}
}

/**
 * The apex answers the API and ingest under the base path. A path outside the base path is not
 * the Site's: the assets binding only serves the build under the base, and the Worker answers
 * nothing else there.
 */
function siteRoute(input: RouteInput): Route {
	if (!isUnderBase(input.pathname)) return { kind: "not_found" }
	const pathname = input.pathname.slice(BASE_PATH.length)
	if (pathname === "/api/usage") return { kind: "usage" }
	if (pathname === "/api/health") return { kind: "health" }
	if (pathname === "/ingest") return { kind: "ingest" }
	return { kind: "not_found" }
}

/**
 * Decides what one request reaches. The old host is the only host whose pages redirect; any other
 * host, including `wrangler dev` on localhost, serves the data site under its base path directly.
 */
export function routeRequest(input: RouteInput): Route {
	if (input.hostname === LEGACY_HOST) return legacyRoute(input)
	return siteRoute(input)
}
