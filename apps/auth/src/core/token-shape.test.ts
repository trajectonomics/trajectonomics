import { describe, expect, it } from "bun:test"
import {
	accessTokenHeaderAlgorithm,
	describeClaims,
	describeJwk,
	describeTokenResponse,
} from "./token-shape"

function base64url(value: Record<string, unknown>): string {
	return btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

const header = base64url({ alg: "EdDSA", typ: "JWT", kid: "test-key" })
const payload = base64url({
	iss: "https://auth.example.test",
	aud: ["https://data.example.test", "https://auth.example.test/api/auth/oauth2/userinfo"],
	sub: "user-1",
	scope: "openid offline_access",
	iat: 1_000,
	exp: 1_900,
	jti: "token-1",
})
const token = `${header}.${payload}.synthetic-signature`

describe("describeTokenResponse", () => {
	it("records field names and presence without copying any value", () => {
		const shape = describeTokenResponse({
			access_token: token,
			refresh_token: "synthetic-refresh-token",
			expires_in: 900,
			token_type: "Bearer",
			scope: "openid offline_access",
		})
		expect(shape.fields).toEqual([
			"access_token",
			"expires_in",
			"refresh_token",
			"scope",
			"token_type",
		])
		expect(shape).not.toHaveProperty("access_token")
		expect(shape.accessTokenIsJwt).toBe(true)
		expect(shape.accessTokenAlgorithm).toBe("EdDSA")
		expect(shape.hasRefreshToken).toBe(true)
		expect(shape.expiresIn).toBe(900)
	})

	it("reports an opaque access token and no refresh token", () => {
		const shape = describeTokenResponse({ access_token: "opaque", expires_in: 900 })
		expect(shape.accessTokenIsJwt).toBe(false)
		expect(shape.accessTokenAlgorithm).toBeNull()
		expect(shape.hasRefreshToken).toBe(false)
	})
})

describe("accessTokenHeaderAlgorithm", () => {
	it("reads a compact JWS header", () => {
		expect(accessTokenHeaderAlgorithm(token)).toBe("EdDSA")
	})

	it("returns null for a non-JWS value", () => {
		expect(accessTokenHeaderAlgorithm("opaque-token")).toBeNull()
		expect(accessTokenHeaderAlgorithm(`${header}.${payload}`)).toBeNull()
		expect(accessTokenHeaderAlgorithm("a.b.c")).toBeNull()
	})
})

describe("describeClaims", () => {
	it("keeps the verifier-relevant claims and redacts the subject", () => {
		const claims = describeClaims({
			iss: "https://auth.example.test",
			aud: ["https://data.example.test", "https://auth.example.test/api/auth/oauth2/userinfo"],
			sub: "user-1",
			scope: "openid offline_access",
			iat: 1_000,
			exp: 1_900,
			jti: "token-1",
		})
		expect(claims.iss).toBe("https://auth.example.test")
		expect(claims.aud).toEqual([
			"https://data.example.test",
			"https://auth.example.test/api/auth/oauth2/userinfo",
		])
		expect(claims.sub).toBe("<redacted>")
		expect(claims.expiresInSeconds).toBe(900)
		expect(claims.hasJti).toBe(true)
	})

	it("tolerates a missing audience and missing times", () => {
		expect(describeClaims({ aud: 7 })).toEqual({
			iss: null,
			aud: [],
			sub: null,
			scope: null,
			expiresInSeconds: null,
			hasJti: false,
		})
	})
})

describe("describeJwk", () => {
	it("reports an Ed25519 public key without its coordinates", () => {
		const shape = describeJwk({
			kty: "OKP",
			crv: "Ed25519",
			alg: "EdDSA",
			kid: "key-1",
			x: "public",
		})
		expect(shape).toEqual({ kty: "OKP", crv: "Ed25519", alg: "EdDSA", use: null, hasKeyId: true })
		expect(shape).not.toHaveProperty("x")
	})
})
