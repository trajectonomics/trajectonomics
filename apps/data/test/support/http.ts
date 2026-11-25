import type { Env } from "../../src/env"
import type { CacheLike } from "../../src/http/cache"
import { type TestDb, testDb } from "./d1"
import { TEST_KEY } from "./fixtures"

export type MemoryCache = CacheLike & { entries: Map<string, Response> }

export type Harness = {
	env: Env
	cache: MemoryCache
	database: TestDb["database"]
}

/** An in-memory D1, the test key, and a cache that behaves like caches.default. */
export function harness(): Harness {
	const { db, database } = testDb()
	return {
		env: { DB: db, INGEST_BOOTSTRAP_KEY: TEST_KEY },
		cache: memoryCache(),
		database,
	}
}

export function memoryCache(): MemoryCache {
	const entries = new Map<string, Response>()
	return {
		entries,
		async match(request) {
			return entries.get(request.url)?.clone()
		},
		async put(request, response) {
			entries.set(request.url, response.clone())
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
