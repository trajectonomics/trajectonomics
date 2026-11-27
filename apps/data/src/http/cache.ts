import { BASE_PATH, SITE_ORIGIN } from "../core/urls"

/** The Cache API methods the read endpoints use. */
export type CacheLike = {
	match(request: Request): Promise<Response | undefined>
	put(request: Request, response: Response): Promise<void>
}

const USAGE_PARAMS = ["asOf", "from", "model", "plan", "to"] as const
/** The peaks endpoint reads one parameter; its cache key keeps only that. */
const PEAKS_PARAMS = ["asOf"] as const

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

/** The canonical URL of a read, with only its known parameters in a fixed order. */
function normalizedReadUrl(request: Request, params: readonly string[]): URL {
	const source = new URL(request.url)
	const url = canonicalApiUrl(request)
	for (const name of params) {
		const value = source.searchParams.get(name)
		if (value !== null) url.searchParams.set(name, value)
	}
	return url
}

/** A copy of a read's key under the internal stale marker. */
function staleKey(url: URL): Request {
	const stale = new URL(url.toString())
	stale.searchParams.set(STALE_PARAM, "1")
	return new Request(stale.toString())
}

/** The cache key for a usage request: the canonical URL, with known params in a fixed order. */
export function usageCacheKey(request: Request): Request {
	return new Request(normalizedReadUrl(request, USAGE_PARAMS).toString())
}

/** The key the stale copy lives under; only this Worker writes it. */
export function usageStaleCacheKey(request: Request): Request {
	return staleKey(normalizedReadUrl(request, USAGE_PARAMS))
}

/** The cache key for a peaks request: the canonical URL, with its as-of day. */
export function peaksCacheKey(request: Request): Request {
	return new Request(normalizedReadUrl(request, PEAKS_PARAMS).toString())
}

/** The key the peaks endpoint's stale copy lives under. */
export function peaksStaleCacheKey(request: Request): Request {
	return staleKey(normalizedReadUrl(request, PEAKS_PARAMS))
}

/** The cache key for the health endpoint. */
export function healthCacheKey(request: Request): Request {
	const url = canonicalApiUrl(request)
	url.search = ""
	url.hash = ""
	return new Request(url.toString())
}
