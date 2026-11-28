import type { JSONWebKeySet } from "jose"

/** How long an in-memory JWKS is trusted, in milliseconds. */
export const JWKS_TTL_MS = 3_600_000

/** The shortest gap between two fetches of one issuer, in milliseconds. */
export const JWKS_REFRESH_MS = 60_000

/** Thrown when auth's JWKS cannot be read; ingest answers 503 instead of 401. */
export class JwksUnavailableError extends Error {
	constructor() {
		super("the auth JWKS is unavailable")
		this.name = "JwksUnavailableError"
	}
}

/** Reads a JWKS for an issuer at an instant, from memory unless it is stale or refresh is asked. */
export type JwksSource = {
	get(issuer: string, nowMs: number, options?: { refresh?: boolean }): Promise<JSONWebKeySet>
}

type CacheEntry = {
	set: JSONWebKeySet
	fetchedAtMs: number
}

function isKeySet(value: unknown): value is JSONWebKeySet {
	if (typeof value !== "object" || value === null) return false
	return Array.isArray((value as { keys?: unknown }).keys)
}

/**
 * A JWKS source with an injected fetch and clock. One set per issuer lives in memory for an hour;
 * `refresh` refetches only when the last fetch is at least a minute old, so a stream of made-up
 * `kid`s cannot become a stream of subrequests (ADR 0015).
 */
export function createJwksSource(fetcher: (url: string) => Promise<Response>): JwksSource {
	const entries = new Map<string, CacheEntry>()
	async function fetchSet(issuer: string, nowMs: number): Promise<JSONWebKeySet> {
		let response: Response
		try {
			response = await fetcher(`${issuer}/jwks`)
		} catch {
			throw new JwksUnavailableError()
		}
		if (!response.ok) throw new JwksUnavailableError()
		let body: unknown
		try {
			body = await response.json()
		} catch {
			throw new JwksUnavailableError()
		}
		if (!isKeySet(body)) throw new JwksUnavailableError()
		entries.set(issuer, { set: body, fetchedAtMs: nowMs })
		return body
	}
	return {
		async get(issuer, nowMs, options = {}) {
			const entry = entries.get(issuer)
			const age = entry === undefined ? Number.POSITIVE_INFINITY : nowMs - entry.fetchedAtMs
			if (entry !== undefined && age < JWKS_TTL_MS) {
				if (options.refresh !== true || age < JWKS_REFRESH_MS) return entry.set
			}
			return fetchSet(issuer, nowMs)
		},
	}
}

/** The instance the Worker injects; it fetches over the global `fetch`, same-zone plain HTTP. */
export const defaultJwksSource: JwksSource = createJwksSource((url) => fetch(url))
