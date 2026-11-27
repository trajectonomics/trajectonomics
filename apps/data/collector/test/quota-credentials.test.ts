import { describe, expect, test } from "bun:test"
import { claudeCredential, openCodeCredential } from "../src/quota/credentials"

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
