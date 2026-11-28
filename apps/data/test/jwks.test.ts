import { describe, expect, test } from "bun:test"
import {
	createJwksSource,
	JWKS_REFRESH_MS,
	JWKS_TTL_MS,
	JwksUnavailableError,
} from "../src/http/jwks"
import { TEST_ISSUER } from "./support/fixtures"

const START = 1_000_000

type Fetch = (url: string, init: { signal: AbortSignal }) => Promise<Response>

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	})
}

const KEYS = {
	keys: [{ kty: "OKP", crv: "Ed25519", x: "test", kid: "test-key", alg: "EdDSA" }],
}

function counting(make: () => Response | Promise<Response>): {
	fetch: Fetch
	calls: () => number
	urls: string[]
} {
	let calls = 0
	const urls: string[] = []
	return {
		calls: () => calls,
		urls,
		fetch: async (url) => {
			calls += 1
			urls.push(url)
			return make()
		},
	}
}

describe("the JWKS source", () => {
	test("keeps a set in memory for an hour", async () => {
		const source = counting(() => json(KEYS))
		const jwks = createJwksSource(source.fetch)
		expect(await jwks.get(TEST_ISSUER, START)).toEqual({ set: KEYS, fetched: true })
		expect(await jwks.get(TEST_ISSUER, START + JWKS_TTL_MS - 1)).toEqual({
			set: KEYS,
			fetched: false,
		})
		expect(source.calls()).toBe(1)
		expect(source.urls).toEqual([`${TEST_ISSUER}/jwks`])
		await jwks.get(TEST_ISSUER, START + JWKS_TTL_MS)
		expect(source.calls()).toBe(2)
	})

	test("honours refresh only once a minute has passed", async () => {
		const source = counting(() => json(KEYS))
		const jwks = createJwksSource(source.fetch)
		await jwks.get(TEST_ISSUER, START)
		expect(await jwks.get(TEST_ISSUER, START + 59_999, { refresh: true })).toEqual({
			set: KEYS,
			fetched: false,
		})
		expect(source.calls()).toBe(1)
		expect(await jwks.get(TEST_ISSUER, START + JWKS_REFRESH_MS, { refresh: true })).toEqual({
			set: KEYS,
			fetched: true,
		})
		expect(source.calls()).toBe(2)
	})

	test("fetches once across a hundred concurrent cold calls", async () => {
		const source = counting(() => json(KEYS))
		const jwks = createJwksSource(source.fetch)
		const calls = Array.from({ length: 100 }, () => jwks.get(TEST_ISSUER, START))
		const results = await Promise.allSettled(calls)
		expect(source.calls()).toBe(1)
		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
		for (const result of results) {
			if (result.status === "rejected") {
				expect(result.reason).toBeInstanceOf(JwksUnavailableError)
			}
		}
	})

	test("fetches once across a hundred concurrent refreshes", async () => {
		const source = counting(() => json(KEYS))
		const jwks = createJwksSource(source.fetch)
		await jwks.get(TEST_ISSUER, START)
		const later = START + JWKS_REFRESH_MS + 1_000
		const calls = Array.from({ length: 100 }, () => jwks.get(TEST_ISSUER, later, { refresh: true }))
		const results = await Promise.allSettled(calls)
		expect(source.calls()).toBe(2)
		const fetched = results.filter(
			(result) => result.status === "fulfilled" && result.value.fetched,
		)
		expect(fetched).toHaveLength(1)
	})

	test("does not retry a failed fetch for a minute, then retries", async () => {
		let attempt = 0
		const source = createJwksSource(async () => {
			attempt += 1
			if (attempt === 1) throw new TypeError("connection refused")
			return json(KEYS)
		})
		await expect(source.get(TEST_ISSUER, START)).rejects.toBeInstanceOf(JwksUnavailableError)
		for (let index = 1; index <= 100; index += 1) {
			await expect(source.get(TEST_ISSUER, START + index * 100)).rejects.toBeInstanceOf(
				JwksUnavailableError,
			)
		}
		expect(attempt).toBe(1)
		expect(await source.get(TEST_ISSUER, START + JWKS_REFRESH_MS)).toEqual({
			set: KEYS,
			fetched: true,
		})
		expect(attempt).toBe(2)
	})

	test("falls back to a cached set when a refresh fails", async () => {
		let attempt = 0
		const source = createJwksSource(async () => {
			attempt += 1
			if (attempt === 1) return json(KEYS)
			throw new TypeError("connection refused")
		})
		await source.get(TEST_ISSUER, START)
		expect(await source.get(TEST_ISSUER, START + JWKS_REFRESH_MS, { refresh: true })).toEqual({
			set: KEYS,
			fetched: false,
		})
	})

	test("throws JwksUnavailableError when a fetch times out", async () => {
		const source = createJwksSource(
			(_url, init) =>
				new Promise<Response>((_resolve, reject) => {
					init.signal.addEventListener("abort", () => reject(new Error("aborted")))
				}),
			{ timeoutMs: 10 },
		)
		await expect(source.get(TEST_ISSUER, START)).rejects.toBeInstanceOf(JwksUnavailableError)
	})

	test("throws JwksUnavailableError on a non-2xx response", async () => {
		const source = createJwksSource(async () => json({ error: "down" }, 503))
		await expect(source.get(TEST_ISSUER, START)).rejects.toBeInstanceOf(JwksUnavailableError)
	})

	test("throws JwksUnavailableError on a network error", async () => {
		const source = createJwksSource(async () => {
			throw new TypeError("connection refused")
		})
		await expect(source.get(TEST_ISSUER, START)).rejects.toBeInstanceOf(JwksUnavailableError)
	})

	test("throws JwksUnavailableError on a body without keys", async () => {
		const source = createJwksSource(async () => json({ nope: true }))
		await expect(source.get(TEST_ISSUER, START)).rejects.toBeInstanceOf(JwksUnavailableError)
	})

	test("throws JwksUnavailableError on a body that is not JSON", async () => {
		const source = createJwksSource(async () => new Response("{"))
		await expect(source.get(TEST_ISSUER, START)).rejects.toBeInstanceOf(JwksUnavailableError)
	})

	test("refuses an empty key list, a null key or a key without kty, and caches none", async () => {
		for (const body of [{ keys: [] }, { keys: [null] }, { keys: [{}] }]) {
			let attempt = 0
			const source = createJwksSource(async () => {
				attempt += 1
				return attempt === 1 ? json(body) : json(KEYS)
			})
			await expect(source.get(TEST_ISSUER, START)).rejects.toBeInstanceOf(JwksUnavailableError)
			expect(await source.get(TEST_ISSUER, START + JWKS_REFRESH_MS)).toEqual({
				set: KEYS,
				fetched: true,
			})
		}
	})

	test("keeps one set per issuer", async () => {
		const source = counting(() => json(KEYS))
		const jwks = createJwksSource(source.fetch)
		await jwks.get(TEST_ISSUER, START)
		await jwks.get("https://other.test", START)
		expect(source.calls()).toBe(2)
	})
})
