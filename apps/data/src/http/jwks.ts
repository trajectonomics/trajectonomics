import type { JSONWebKeySet } from "jose"

/** How long an in-memory JWKS is trusted, in milliseconds. */
export const JWKS_TTL_MS = 3_600_000

/** The shortest gap between two fetches of one issuer, in milliseconds. */
export const JWKS_REFRESH_MS = 60_000

/** The timeout of one fetch when none is injected, in milliseconds. */
export const JWKS_TIMEOUT_MS = 5_000

/** Thrown when auth's JWKS cannot be read; ingest answers 503 instead of 401. */
export class JwksUnavailableError extends Error {
	constructor() {
		super("the auth JWKS is unavailable")
		this.name = "JwksUnavailableError"
	}
}

/** A set at an instant, and whether this call fetched a new one. */
export type JwksResult = { set: JSONWebKeySet; fetched: boolean }

/** Reads a JWKS for an issuer at an instant, from memory unless it is stale or refresh is asked. */
export type JwksSource = {
	get(issuer: string, nowMs: number, options?: { refresh?: boolean }): Promise<JwksResult>
}

/** One issuer's cached set and its last fetch attempt, which need not have succeeded. */
type IssuerState = { entry?: { set: JSONWebKeySet; atMs: number }; attemptMs?: number }

/** A set is usable only when it carries at least one key object whose `kty` is a string. */
function isKeySet(value: unknown): value is JSONWebKeySet {
	if (typeof value !== "object" || value === null) return false
	const keys = (value as { keys?: unknown }).keys
	if (!Array.isArray(keys) || keys.length === 0) return false
	const hasKty = (key: unknown) =>
		typeof key === "object" && key !== null && typeof (key as { kty?: unknown }).kty === "string"
	return keys.every(hasKty)
}

/** The cached set, or null when nothing is cached. */
function cached(state: IssuerState): JSONWebKeySet | null {
	return state.entry === undefined ? null : state.entry.set
}

/** The cached set as a result while it is inside its hour, or null. */
function fresh(state: IssuerState, nowMs: number): JwksResult | null {
	if (state.entry === undefined || nowMs - state.entry.atMs >= JWKS_TTL_MS) return null
	return { set: state.entry.set, fetched: false }
}

/** Whether a fetch started less than a minute ago, so another must not start. */
function throttled(state: IssuerState, nowMs: number): boolean {
	return state.attemptMs !== undefined && nowMs - state.attemptMs < JWKS_REFRESH_MS
}

/** The stale set while a fetch is throttled, or an unavailable error when nothing is cached. */
function held(state: IssuerState, nowMs: number): JwksResult | null {
	if (!throttled(state, nowMs)) return null
	const stale = cached(state)
	if (stale === null) throw new JwksUnavailableError()
	return { set: stale, fetched: false }
}

/** A failed fetch hands back a stale set when one exists, and is unavailable without one. */
function fallback(error: unknown, state: IssuerState): JwksResult {
	const stale = cached(state)
	if (stale === null) throw error
	return { set: stale, fetched: false }
}

/**
 * A JWKS source with an injected fetch, clock and timeout. One set per issuer lives in memory for an
 * hour, and a fetch starts at most once a minute per issuer whatever asks for it, so a concurrent
 * cold start, a refresh storm or a stream of made-up `kid`s cannot become a stream of subrequests
 * (ADR 0015). A failed refresh falls back to the cached set, and a fetch is never shared across
 * requests, because Workers forbid cross-request I/O.
 */
export function createJwksSource(
	fetcher: (url: string, init: { signal: AbortSignal }) => Promise<Response>,
	options: { timeoutMs?: number } = {},
): JwksSource {
	const states = new Map<string, IssuerState>()
	const timeoutMs = options.timeoutMs ?? JWKS_TIMEOUT_MS
	async function fetchSet(issuer: string): Promise<JSONWebKeySet> {
		let response: Response
		try {
			response = await fetcher(`${issuer}/jwks`, { signal: AbortSignal.timeout(timeoutMs) })
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
		return body
	}
	async function get(
		issuer: string,
		nowMs: number,
		wanted: { refresh?: boolean } = {},
	): Promise<JwksResult> {
		const state: IssuerState = states.get(issuer) ?? {}
		states.set(issuer, state)
		const kept = fresh(state, nowMs)
		if (kept !== null && wanted.refresh !== true) return kept
		const keptStale = held(state, nowMs)
		if (keptStale !== null) return keptStale
		state.attemptMs = nowMs
		try {
			const set = await fetchSet(issuer)
			state.entry = { set, atMs: nowMs }
			return { set, fetched: true }
		} catch (error) {
			return fallback(error, state)
		}
	}
	return { get }
}

/** The instance the Worker injects; it fetches over the global `fetch`, same-zone plain HTTP. */
export const defaultJwksSource: JwksSource = createJwksSource((url, init) => fetch(url, init))
