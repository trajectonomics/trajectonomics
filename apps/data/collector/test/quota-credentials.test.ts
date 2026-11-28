import { describe, expect, test } from "bun:test"
import { claudeCredential, openCodeCredential } from "../src/quota/credentials"
import { antigravityCredential, cursorCredential } from "../src/quota/credentials-extra"

const NOW = Date.parse("2026-11-27T14:00:00.000Z")
const TOKEN = "synthetic-claude-token"

function claudeFile(expiresAt: number): string {
	return JSON.stringify({ claudeAiOauth: { accessToken: TOKEN, expiresAt } })
}

describe("claudeCredential", () => {
	test("reports a missing file", () => {
		expect(claudeCredential(null, NOW)).toEqual({ ok: false, reason: "missing" })
	})

	test("reports an expired token without exposing it", () => {
		const credential = claudeCredential(claudeFile(NOW - 1), NOW)
		expect(credential).toEqual({ ok: false, reason: "expired" })
		expect(JSON.stringify(credential)).not.toContain(TOKEN)
	})

	test("accepts a token that is still valid", () => {
		expect(claudeCredential(claudeFile(NOW + 60_000), NOW)).toEqual({ ok: true, token: TOKEN })
	})

	test("reports a malformed file", () => {
		expect(claudeCredential("{", NOW)).toEqual({ ok: false, reason: "malformed" })
		expect(claudeCredential('{"claudeAiOauth":{}}', NOW)).toEqual({
			ok: false,
			reason: "malformed",
		})
	})
})

describe("openCodeCredential", () => {
	test("reports a missing file", () => {
		expect(openCodeCredential(null)).toEqual({ ok: false, reason: "missing" })
	})

	test("reads the OpenCode Go key", () => {
		const contents = JSON.stringify({ "opencode-go": { key: "synthetic-opencode-key" } })
		expect(openCodeCredential(contents)).toEqual({ ok: true, token: "synthetic-opencode-key" })
	})

	test("reports a malformed or empty key", () => {
		expect(openCodeCredential("not json")).toEqual({ ok: false, reason: "malformed" })
		expect(openCodeCredential('{"opencode-go":{"key":""}}')).toEqual({
			ok: false,
			reason: "malformed",
		})
	})
})

function syntheticJwt(expSeconds: number): string {
	const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url")
	const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url")
	return `${header}.${payload}.sig`
}

describe("antigravityCredential", () => {
	test("reports missing, expired, valid and malformed tokens", () => {
		expect(antigravityCredential(null, NOW)).toEqual({ ok: false, reason: "missing" })
		const expired = JSON.stringify({
			token: { access_token: "synthetic-ag", expiry: "2026-11-27T13:59:59.000Z" },
		})
		expect(antigravityCredential(expired, NOW)).toEqual({ ok: false, reason: "expired" })
		const valid = JSON.stringify({
			token: { access_token: "synthetic-ag", expiry: "2026-11-27T14:30:00.000Z" },
		})
		expect(antigravityCredential(valid, NOW)).toEqual({ ok: true, token: "synthetic-ag" })
		expect(antigravityCredential('{"token":{"access_token":"synthetic-ag"}}', NOW)).toEqual({
			ok: true,
			token: "synthetic-ag",
		})
		expect(antigravityCredential('{"token":{"access_token":"x","expiry":"bad"}}', NOW)).toEqual({
			ok: false,
			reason: "malformed",
		})
	})
})

describe("cursorCredential", () => {
	test("reports missing, expired JWT, valid JWT and malformed files", () => {
		expect(cursorCredential(null, NOW)).toEqual({ ok: false, reason: "missing" })
		const expired = JSON.stringify({ accessToken: syntheticJwt(Math.floor(NOW / 1000) - 10) })
		expect(cursorCredential(expired, NOW)).toEqual({ ok: false, reason: "expired" })
		const validToken = syntheticJwt(Math.floor(NOW / 1000) + 60)
		expect(cursorCredential(JSON.stringify({ accessToken: validToken }), NOW)).toEqual({
			ok: true,
			token: validToken,
		})
		expect(cursorCredential('{"accessToken":"opaque-token"}', NOW)).toEqual({
			ok: true,
			token: "opaque-token",
		})
		expect(cursorCredential('{"accessToken":""}', NOW)).toEqual({ ok: false, reason: "malformed" })
	})
})
