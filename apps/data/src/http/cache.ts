import { BASE_PATH, SITE_ORIGIN } from "../core/urls"

/** The Cache API methods the read endpoints use. */
export type CacheLike = {
	match(request: Request): Promise<Response | undefined>
	put(request: Request, response: Response): Promise<void>
}

const USAGE_PARAMS = ["asOf", "from", "model", "plan", "to"] as const

/** The internal marker on the stale copy's key; a client copy is stripped when normalising. */
const STALE_PARAM = "__stale"

/** How long the fresh copy lives, in seconds. */
export const FRESH_MAX_AGE = 3_600
/** How long the stale copy lives, in seconds. */
export const STALE_MAX_AGE = 86_400

/**
 * One resource has one cache key, whichever address reached it: the old host's `/api/...` and the
 * apex's `/data/api/...` normalise to the same canonical URL.
 */
function canonicalApiUrl(request: Request): URL {
	const source = new URL(request.url)
	const pathname = source.pathname.startsWith(`${BASE_PATH}/`)
		? source.pathname
		: `${BASE_PATH}${source.pathname}`
	const url = new URL(SITE_ORIGIN)
	url.pathname = pathname
	return url
}

function normalizedUsageUrl(request: Request): URL {
	const source = new URL(request.url)
	const url = canonicalApiUrl(request)
	for (const name of USAGE_PARAMS) {
		const value = source.searchParams.get(name)
		if (value !== null) url.searchParams.set(name, value)
	}
	return url
}

/** The cache key for a usage request: the canonical URL, with known params in a fixed order. */
export function usageCacheKey(request: Request): Request {
	return new Request(normalizedUsageUrl(request).toString())
}

/** The key the stale copy lives under; only this Worker writes it. */
export function usageStaleCacheKey(request: Request): Request {
	const url = normalizedUsageUrl(request)
	url.searchParams.set(STALE_PARAM, "1")
	return new Request(url.toString())
}

/** The cache key for the health endpoint. */
export function healthCacheKey(request: Request): Request {
	const url = canonicalApiUrl(request)
	url.search = ""
	url.hash = ""
	return new Request(url.toString())
}
