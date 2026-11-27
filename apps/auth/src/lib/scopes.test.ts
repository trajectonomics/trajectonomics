import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "./language"
import { scopeLines, scopeText } from "./scopes"

describe("the scopes an app asks for", () => {
	it("maps the data collector's scopes to plain words", () => {
		const lines = scopeLines("openid offline_access data:ingest")
		expect(lines).toEqual([
			{ scope: "openid", key: "scopeOpenId" },
			{ scope: "offline_access", key: "scopeOffline" },
			{ scope: "data:ingest", key: "scopeDataIngest" },
		])
		expect(scopeText(lines[2]!, dictionaryFor("en"))).toBe(
			"Send your AI usage numbers to the data site",
		)
	})

	it("keeps the scope itself when no line exists", () => {
		const line = scopeLines("custom:read")[0]
		expect(line).toEqual({ scope: "custom:read", key: null })
		expect(scopeText(line!, dictionaryFor("en"))).toBe("custom:read")
	})

	it("lists a repeated scope once and ignores extra spaces", () => {
		expect(scopeLines("  openid   openid  ").length).toBe(1)
	})

	const combinations: readonly (readonly [string, readonly string[]])[] = [
		["openid", ["Know which account you are"]],
		["openid profile email", ["See your name, email and profile picture"]],
		["email openid profile", ["See your name, email and profile picture"]],
		["profile email", ["See your name, email and profile picture"]],
		["profile", ["See your name and profile picture"]],
		["openid profile", ["Know which account you are", "See your name and profile picture"]],
		["email", ["See your email"]],
		["openid email", ["Know which account you are", "See your email"]],
		[
			"openid offline_access data:ingest",
			[
				"Know which account you are",
				"Stay connected after you close the app",
				"Send your AI usage numbers to the data site",
			],
		],
		[
			"offline_access openid profile email",
			["Stay connected after you close the app", "See your name, email and profile picture"],
		],
	]

	for (const [scope, expected] of combinations) {
		it(`says exactly what "${scope}" releases`, () => {
			const words = dictionaryFor("en")
			expect(scopeLines(scope).map((line) => scopeText(line, words))).toEqual([...expected])
		})
	}

	it("has nothing to show when the app asked for nothing", () => {
		expect(scopeLines(null)).toEqual([])
		expect(scopeLines("")).toEqual([])
	})
})
