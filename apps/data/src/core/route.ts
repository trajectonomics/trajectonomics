import {
	BASE_PATH,
	CALLBACK_PATH,
	COLLECTORS_PATH,
	INTERNAL_HOST,
	LEGACY_HOST,
	SIGN_IN_PATH,
	SIGN_OUT_PATH,
	SITE_ORIGIN,
} from "./urls"

/** What the Worker answers for one request; `src/http/router.ts` turns it into a Response. */
export type Route =
	| { kind: "usage" }
	| { kind: "peaks" }
	| { kind: "health" }
	| { kind: "ingest" }
	| { kind: "delete_contributor" }
	| { kind: "sign_in" }
	| { kind: "auth_callback" }
	| { kind: "sign_out" }
	| { kind: "me_collectors" }
	| { kind: "not_found" }
	| { kind: "redirect"; location: string }
	| { kind: "method_not_allowed"; allow: string }

/** The one path auth's deletion notice reaches on the service-binding host (ADR 0015). */
const INTERNAL_DELETE_PATH = "/internal/contributors/delete"

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

/** The me read is private to the apex, so the old host answers it as a miss on both prefixes. */
function isMeApi(pathname: string): boolean {
	const relative = isUnderBase(pathname) ? pathname.slice(BASE_PATH.length) : pathname
	return relative === "/api/me" || relative.startsWith("/api/me/")
}

/** The API paths both hosts answer, relative to the base path. */
function apiRoute(pathname: string): Route | null {
	if (pathname === "/api/usage") return { kind: "usage" }
	if (pathname === "/api/peaks") return { kind: "peaks" }
	if (pathname === "/api/health") return { kind: "health" }
	return null
}

/** A 405 unless the request uses `allowed`, the one method the route accepts. */
function method(input: RouteInput, allowed: string): Route | null {
	return input.method === allowed ? null : { kind: "method_not_allowed", allow: allowed }
}

/** The old host's pages answer a permanent redirect, or a 405 for a method a page does not take. */
function pageRoute(input: RouteInput): Route {
	if (input.method !== "GET" && input.method !== "HEAD") {
		return { kind: "method_not_allowed", allow: "GET, HEAD" }
	}
	return {
		kind: "redirect",
		location: `${SITE_ORIGIN}${legacyTarget(input.pathname)}${input.search}`,
	}
}

/**
 * The old host keeps the API and the ingest it always had: a redirect there would turn the
 * collector's POST into a GET. It also answers them under the base path, because an asset under
 * `/data/` is served on every host before this script runs, and such a page calls `/data/api/*`
 * on the host it came from; a redirect would make that call cross-origin. Every other GET or HEAD
 * is a page, and answers a permanent redirect to the same path under the apex's base path.
 */
function legacyRoute(input: RouteInput): Route {
	const prefixed = isUnderBase(input.pathname) ? siteRoute(input, false) : undefined
	if (prefixed !== undefined && prefixed.kind !== "not_found") return prefixed
	if (isMeApi(input.pathname)) return { kind: "not_found" }
	const api = apiRoute(input.pathname)
	if (api !== null) return api
	if (input.pathname.startsWith("/api/")) return { kind: "not_found" }
	if (input.pathname === "/ingest") return { kind: "ingest" }
	return pageRoute(input)
}

/** The sign-in routes exist on the apex only: its cookies and redirect URI belong to it. */
function apexRoute(input: RouteInput): Route | null {
	if (input.pathname === SIGN_IN_PATH) return method(input, "GET") ?? { kind: "sign_in" }
	if (input.pathname === CALLBACK_PATH) return method(input, "GET") ?? { kind: "auth_callback" }
	if (input.pathname === SIGN_OUT_PATH) return method(input, "POST") ?? { kind: "sign_out" }
	if (input.pathname === COLLECTORS_PATH) return method(input, "GET") ?? { kind: "me_collectors" }
	return null
}

/**
 * The apex answers the API, ingest and the browser's sign-in routes under the base path. A path
 * outside the base path is not the Site's: the assets binding only serves the build under the
 * base, and the Worker answers nothing else there. `apex` keeps the sign-in routes off the old
 * host, whose cookies and registered redirect URI belong to the apex.
 */
function siteRoute(input: RouteInput, apex: boolean): Route {
	if (!isUnderBase(input.pathname)) return { kind: "not_found" }
	const pathname = input.pathname.slice(BASE_PATH.length)
	const api = apiRoute(pathname)
	if (api !== null) return api
	if (pathname === "/ingest") return { kind: "ingest" }
	if (!apex) return { kind: "not_found" }
	return apexRoute(input) ?? { kind: "not_found" }
}

/**
 * The service-binding host answers auth's deletion notice and nothing else (ADR 0015). It has no
 * DNS, so only a Worker reaching this one through the `DATA` binding ever sends this hostname.
 */
function internalRoute(input: RouteInput): Route {
	if (input.pathname !== INTERNAL_DELETE_PATH) return { kind: "not_found" }
	if (input.method !== "POST") return { kind: "method_not_allowed", allow: "POST" }
	return { kind: "delete_contributor" }
}

/**
 * Decides what one request reaches. The internal host is checked first and answers one path; the
 * old host is the only host whose pages redirect; any other host, including `wrangler dev` on
 * localhost, serves the data site under its base path directly.
 */
export function routeRequest(input: RouteInput): Route {
	if (input.hostname === INTERNAL_HOST) return internalRoute(input)
	// The internal endpoint never redirects: a redirect would turn auth's POST into a GET.
	if (input.pathname.startsWith("/internal/")) return { kind: "not_found" }
	if (input.pathname.startsWith(`${BASE_PATH}/internal/`)) return { kind: "not_found" }
	if (input.hostname === LEGACY_HOST) return legacyRoute(input)
	return siteRoute(input, true)
}
