import { describe, expect, test } from "bun:test"
import {
	createJwksSource,
	JWKS_MAX_STALE_MS,
	JWKS_TTL_MS,
	JwksUnavailableError,
} from "../src/http/jwks"
import { TEST_ISSUER } from "./support/fixtures"

const START = 1_000_000

const KEYS = {
	keys: [{ kty: "OKP", crv: "Ed25519", x: "test", kid: "test-key", alg: "EdDSA" }],
}

/** A source whose first fetch succeeds and every later one fails, as during an auth outage. */
function upThenDown() {
	let attempt = 0
	return createJwksSource(async () => {
		attempt += 1
		if (attempt === 1) return Response.json(KEYS)
		throw new TypeError("connection refused")
	})
}

describe("a JWKS source during an auth outage", () => {
	test("serves a set past its hour but younger than a day", async () => {
		const source = upThenDown()
		await source.get(TEST_ISSUER, START)
		expect(await source.get(TEST_ISSUER, START + JWKS_TTL_MS + 1)).toEqual({
			set: KEYS,
			fetched: false,
		})
	})

	test("is unavailable once the cached set is a day old", async () => {
		const source = upThenDown()
		await source.get(TEST_ISSUER, START)
		await expect(source.get(TEST_ISSUER, START + JWKS_MAX_STALE_MS)).rejects.toBeInstanceOf(
			JwksUnavailableError,
		)
	})

	test("a throttled call does not serve a set older than a day either", async () => {
		const source = upThenDown()
		await source.get(TEST_ISSUER, START)
		await expect(source.get(TEST_ISSUER, START + JWKS_MAX_STALE_MS)).rejects.toBeInstanceOf(
			JwksUnavailableError,
		)
		await expect(source.get(TEST_ISSUER, START + JWKS_MAX_STALE_MS + 1_000)).rejects.toBeInstanceOf(
			JwksUnavailableError,
		)
	})
})
