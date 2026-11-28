import { BASE_PATH, SITE_ORIGIN } from "../core/urls"

/** The Cache API methods the read endpoints use. */
export type CacheLike = {
	match(request: Request): Promise<Response | undefined>
	put(request: Request, response: Response): Promise<void>
}

const USAGE_PARAMS = ["asOf", "from", "model", "plan", "to"] as const
/** The hourly read takes the day window and the as-of cap, and nothing else. */
const HOURLY_PARAMS = ["asOf", "from", "to"] as const
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

/** The cache key for an hourly read: the canonical URL, its window in a fixed order. */
export function hourlyCacheKey(request: Request): Request {
	return new Request(normalizedReadUrl(request, HOURLY_PARAMS).toString())
}

/** The key the hourly read's stale copy lives under. */
export function hourlyStaleCacheKey(request: Request): Request {
	return staleKey(normalizedReadUrl(request, HOURLY_PARAMS))
}

/**
 * The shape of the peaks body. A change to the body bumps it, so a cached body of the old shape is
 * never served to a page built for the new one: on 2026-11-27 a cached body without `measured`
 * broke the overview for hours after the deploy that added it. Shape 3 leaves cache reads out of
 * the token figure and adds `cacheRead` beside it; shape 4 adds each window's `limits` estimate
 * from the plan's usage meter; shape 5 adds the estimate's processed-token and list-dollar
 * measures and its 24-hour rough rule.
 */
export const PEAKS_SHAPE = "5"

function peaksUrl(request: Request): URL {
	const url = normalizedReadUrl(request, PEAKS_PARAMS)
	url.searchParams.set("shape", PEAKS_SHAPE)
	return url
}

/** The cache key for a peaks request: the canonical URL, its as-of day and the body's shape. */
export function peaksCacheKey(request: Request): Request {
	return new Request(peaksUrl(request).toString())
}

/** The key the peaks endpoint's stale copy lives under. */
export function peaksStaleCacheKey(request: Request): Request {
	return staleKey(peaksUrl(request))
}

/** The cache key for the health endpoint. */
export function healthCacheKey(request: Request): Request {
	const url = canonicalApiUrl(request)
	url.search = ""
	url.hash = ""
	return new Request(url.toString())
}
