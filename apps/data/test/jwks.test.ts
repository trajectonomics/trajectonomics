import { describe, expect, test } from "bun:test"
import { createJwksSource, JWKS_TTL_MS, JwksUnavailableError } from "../src/http/jwks"
import { TEST_ISSUER } from "./support/fixtures"

const START = 1_000_000

type Fetch = (url: string) => Promise<Response>

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	})
}

const KEYS = {
	keys: [{ kty: "OKP", crv: "Ed25519", x: "test", kid: "test-key", alg: "EdDSA" }],
}

function counting(make: () => Response): { fetch: Fetch; calls: () => number; urls: string[] } {
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
		expect(await jwks.get(TEST_ISSUER, START)).toEqual(KEYS)
		expect(await jwks.get(TEST_ISSUER, START + JWKS_TTL_MS - 1)).toEqual(KEYS)
		expect(source.calls()).toBe(1)
		expect(source.urls).toEqual([`${TEST_ISSUER}/jwks`])
		await jwks.get(TEST_ISSUER, START + JWKS_TTL_MS)
		expect(source.calls()).toBe(2)
	})

	test("honours refresh only once a minute has passed", async () => {
		const source = counting(() => json(KEYS))
		const jwks = createJwksSource(source.fetch)
		await jwks.get(TEST_ISSUER, START)
		await jwks.get(TEST_ISSUER, START + 59_999, { refresh: true })
		expect(source.calls()).toBe(1)
		await jwks.get(TEST_ISSUER, START + 60_000, { refresh: true })
		expect(source.calls()).toBe(2)
	})

	test("does not cache a failed fetch", async () => {
		let attempt = 0
		const source = createJwksSource(async () => {
			attempt += 1
			if (attempt === 1) throw new TypeError("connection refused")
			return json(KEYS)
		})
		await expect(source.get(TEST_ISSUER, START)).rejects.toBeInstanceOf(JwksUnavailableError)
		expect(await source.get(TEST_ISSUER, START)).toEqual(KEYS)
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

	test("keeps one set per issuer", async () => {
		const source = counting(() => json(KEYS))
		const jwks = createJwksSource(source.fetch)
		await jwks.get(TEST_ISSUER, START)
		await jwks.get("https://other.test", START)
		expect(source.calls()).toBe(2)
	})
})
