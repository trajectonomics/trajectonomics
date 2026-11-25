/** The Cache API methods the read endpoints use. */
export type CacheLike = {
	match(request: Request): Promise<Response | undefined>
	put(request: Request, response: Response): Promise<void>
}

const USAGE_PARAMS = ["asOf", "from", "model", "plan", "to"] as const

/** The cache key for a usage request: same host and path, known params in a fixed order. */
export function usageCacheKey(request: Request): Request {
	const source = new URL(request.url)
	const url = new URL(source.origin + source.pathname)
	for (const name of USAGE_PARAMS) {
		const value = source.searchParams.get(name)
		if (value !== null) url.searchParams.set(name, value)
	}
	return new Request(url.toString())
}

/** The cache key for the health endpoint. */
export function healthCacheKey(request: Request): Request {
	const url = new URL(request.url)
	url.search = ""
	url.hash = ""
	return new Request(url.toString())
}
