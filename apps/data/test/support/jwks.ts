import type { JSONWebKeySet } from "jose"
import { type JwksResult, type JwksSource, JwksUnavailableError } from "../../src/http/jwks"

export type FakeJwks = JwksSource & {
	calls: () => number
	refreshes: () => number
}

/**
 * A JWKS source over fixed sets. A `refresh` counts as a fetch and swaps in `fresh` when it is
 * given; the counters let a test assert that an unknown `kid` caused exactly one refetch.
 */
export function fakeJwks(initial: JSONWebKeySet, fresh?: JSONWebKeySet): FakeJwks {
	let served = initial
	let calls = 0
	let refreshes = 0
	return {
		calls: () => calls,
		refreshes: () => refreshes,
		async get(_issuer, _nowMs, options = {}): Promise<JwksResult> {
			calls += 1
			if (options.refresh !== true) return { set: served, fetched: false }
			refreshes += 1
			if (fresh !== undefined) served = fresh
			return { set: served, fetched: true }
		},
	}
}

/** A JWKS source that is down, which must surface as 503 and never as 401. */
export function failingJwks(): JwksSource {
	return {
		async get() {
			throw new JwksUnavailableError()
		},
	}
}
