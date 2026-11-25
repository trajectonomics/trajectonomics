import type { Env } from "../../src/env"
import type { CacheLike } from "../../src/http/cache"
import { type Statement, type TestDb, testDb } from "./d1"
import { NOW_MS, TEST_KEY } from "./fixtures"

type CacheEntry = {
	response: Response
	expiresAt: number
}

export type MemoryCache = CacheLike & {
	entries: Map<string, CacheEntry>
	/** The fake clock the cache reads, so a test can let an entry expire. */
	now: { value: number }
}

export type Harness = {
	env: Env
	cache: MemoryCache
	database: TestDb["database"]
	calls: () => number
	batches: () => Statement[][]
}

/** An in-memory D1, the test key, and a cache that honours each response's max-age. */
export function harness(options: { maxCalls?: number } = {}): Harness {
	const { db, database, calls, batches } = testDb(options)
	return {
		env: { DB: db, INGEST_BOOTSTRAP_KEY: TEST_KEY },
		cache: memoryCache(),
		database,
		calls,
		batches,
	}
}

/** A cache that expires a copy once its max-age elapses, like a correct HTTP cache. */
export function memoryCache(): MemoryCache {
	const entries = new Map<string, CacheEntry>()
	const now = { value: NOW_MS }
	return {
		entries,
		now,
		async match(request) {
			const entry = entries.get(request.url)
			if (entry === undefined) return undefined
			if (now.value >= entry.expiresAt) {
				entries.delete(request.url)
				return undefined
			}
			return entry.response.clone()
		},
		async put(request, response) {
			const control = response.headers.get("cache-control") ?? ""
			const match = /max-age=(\d+)/.exec(control)
			const ttl = match === null ? 0 : Number(match[1]) * 1000
			entries.set(request.url, { response: response.clone(), expiresAt: now.value + ttl })
		},
	}
}

export function ingestRequest(body: unknown, key = TEST_KEY): Request {
	return new Request("https://data.test/ingest", {
		method: "POST",
		headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
		body: JSON.stringify(body),
	})
}

export function get(path: string): Request {
	return new Request(`https://data.test${path}`)
}
