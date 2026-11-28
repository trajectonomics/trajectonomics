import { beforeAll, describe, expect, test } from "bun:test"
import {
	DATA_AUDIENCE,
	INGEST_SCOPE,
	type TokenVerification,
	verifyAccessToken,
} from "../src/core/token"
import { TEST_ISSUER } from "./support/fixtures"
import { type TestSigner, TOKEN_NOW_SECONDS, testSigner } from "./support/token"

const NOW = TOKEN_NOW_SECONDS
let signer: TestSigner

beforeAll(async () => {
	signer = await testSigner()
})

function verify(
	token: string,
	requiredScope: string | null = INGEST_SCOPE,
): Promise<TokenVerification> {
	return verifyAccessToken(token, {
		jwks: signer.jwks,
		issuer: TEST_ISSUER,
		audience: DATA_AUDIENCE,
		requiredScope,
		nowSeconds: NOW,
	})
}

function segment(value: object): string {
	return Buffer.from(JSON.stringify(value)).toString("base64url")
}

function compact(header: object, payload: object, signature = ""): string {
	return `${segment(header)}.${segment(payload)}.${signature}`
}

function claims(): Record<string, unknown> {
	return {
		sub: "auth-user-a",
		iss: TEST_ISSUER,
		aud: DATA_AUDIENCE,
		scope: INGEST_SCOPE,
		iat: NOW - 60,
		exp: NOW + 900,
	}
}

async function tamperedPayload(): Promise<string> {
	const parts = (await signer.sign()).split(".")
	parts[1] = segment({ ...claims(), sub: "auth-user-b" })
	return parts.join(".")
}

describe("verifyAccessToken accepts", () => {
	test("a valid access token", async () => {
		expect(await verify(await signer.sign())).toEqual({ ok: true, sub: "auth-user-a" })
	})

	test("an audience array that contains data plus auth's userinfo endpoint", async () => {
		const token = await signer.sign({
			audience: [DATA_AUDIENCE, "https://auth.trajectonomics.com/api/auth/oauth2/userinfo"],
		})
		expect(await verify(token)).toEqual({ ok: true, sub: "auth-user-a" })
	})

	test("an expired token still inside the 30-second skew", async () => {
		const token = await signer.sign({ iat: NOW - 600, exp: NOW - 10 })
		expect(await verify(token)).toEqual({ ok: true, sub: "auth-user-a" })
	})

	test("a token with no scope when no scope is required", async () => {
		const token = await signer.sign({ scope: null })
		expect(await verify(token, null)).toEqual({ ok: true, sub: "auth-user-a" })
	})
})

describe("verifyAccessToken refuses", () => {
	const cases: [string, () => Promise<string>][] = [
		["a trailing-slash issuer", () => signer.sign({ issuer: `${TEST_ISSUER}/` })],
		["an audience without data", () => signer.sign({ audience: "https://example.test/other" })],
		["a missing scope", () => signer.sign({ scope: null })],
		["a lookalike scope", () => signer.sign({ scope: "data:ingestx" })],
		["an expiry beyond the skew", () => signer.sign({ iat: NOW - 600, exp: NOW - 31 })],
		["an nbf in the future", () => signer.sign({ nbf: NOW + 31 })],
		["an iat in the future", () => signer.sign({ iat: NOW + 31, exp: NOW + 900 })],
		["a lifetime over one hour", () => signer.sign({ iat: NOW - 4_000, exp: NOW + 600 })],
		["a missing sub", () => signer.sign({ sub: null })],
		["an HS256 token", async () => compact({ alg: "HS256", typ: "JWT" }, claims(), "c2ln")],
		["an alg none token", async () => compact({ alg: "none", typ: "JWT" }, claims())],
		["a tampered payload", tamperedPayload],
	]

	for (const [name, make] of cases) {
		test(name, async () => {
			expect(await verify(await make())).toEqual({ ok: false, reason: "invalid" })
		})
	}

	test("an unknown kid as unknown_kid", async () => {
		expect(await verify(await signer.sign({ kid: "other-key" }))).toEqual({
			ok: false,
			reason: "unknown_kid",
		})
	})

	test("a string that is not a JWS as malformed", async () => {
		expect(await verify("not-a-token")).toEqual({ ok: false, reason: "malformed" })
	})
})
