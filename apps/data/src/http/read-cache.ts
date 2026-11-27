import type { QueryError } from "../core/errors"
import { type CacheLike, FRESH_MAX_AGE, STALE_MAX_AGE } from "./cache"
import { json } from "./responses"

const FRESH_CACHE_CONTROL = `public, max-age=${FRESH_MAX_AGE}, stale-if-error=${STALE_MAX_AGE}`
const ERROR_CACHE_CONTROL = `public, max-age=${FRESH_MAX_AGE}`
/** The stored stale copy's lifetime; only this Worker's cache holds it, never a reader's. */
const STALE_CACHE_CONTROL = `public, max-age=${STALE_MAX_AGE}`

/** Puts one copy without letting a cache failure break a good response. */
async function put(cache: CacheLike, key: Request, response: Response): Promise<void> {
	try {
		await cache.put(key, response)
	} catch (error) {
		console.error("data: cache put failed", error)
	}
}

/** A copy of a response with its own cache lifetime and optional extra headers. */
function copyWith(
	response: Response,
	cacheControl: string,
	extra: Record<string, string> = {},
): Response {
	const headers = new Headers(response.headers)
	headers.set("cache-control", cacheControl)
	for (const [name, value] of Object.entries(extra)) headers.set(name, value)
	return new Response(response.clone().body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

/** Caches and returns a 400, so a repeated bad query does not reach D1. */
export async function cachedInvalid(
	cache: CacheLike | undefined,
	key: Request,
	error: QueryError,
): Promise<Response> {
	const response = json(
		{ error: "invalid_query", ...error },
		{ status: 400, headers: { "cache-control": ERROR_CACHE_CONTROL } },
	)
	if (cache !== undefined) await put(cache, key, response.clone())
	return response
}

/**
 * Caches the fresh copy under the request's key and the long-lived stale copy under the read's
 * stale key, then returns the response.
 */
export async function cachedFresh(
	cache: CacheLike | undefined,
	key: Request,
	staleKey: Request,
	body: unknown,
): Promise<Response> {
	const response = json(body, { headers: { "cache-control": FRESH_CACHE_CONTROL } })
	if (cache !== undefined) {
		await put(cache, key, response.clone())
		await put(cache, staleKey, copyWith(response, STALE_CACHE_CONTROL))
	}
	return response
}

/**
 * The stale copy served after D1 fails, marked so callers can see it is old. It is never cached
 * again: a downstream copy would outlive the failure and could not be corrected.
 */
export async function cachedStale(
	cache: CacheLike | undefined,
	staleKey: Request,
): Promise<Response | undefined> {
	if (cache === undefined) return undefined
	const stale = await cache.match(staleKey)
	if (stale === undefined) return undefined
	return copyWith(stale, "no-store", { "x-data-stale": "1" })
}
