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

	it("has nothing to show when the app asked for nothing", () => {
		expect(scopeLines(null)).toEqual([])
		expect(scopeLines("")).toEqual([])
	})
})
