import { describe, expect, test } from "bun:test"
import { SITE_ORIGIN } from "../site"
import { legacyDocsLocation } from "./legacy-docs-path"

function location(url: string): string | null {
	return legacyDocsLocation(new URL(url))
}

describe("the old /docs mount", () => {
	test("an apex request moves to this host and drops the prefix", () => {
		expect(location("https://trajectonomics.com/docs/cli/commands/tx/?q=1")).toBe(
			`${SITE_ORIGIN}/cli/commands/tx/?q=1`,
		)
		expect(location("https://www.trajectonomics.com/docs")).toBe(`${SITE_ORIGIN}/`)
		expect(location("https://trajectonomics.com/docs/")).toBe(`${SITE_ORIGIN}/`)
	})

	test("a request that is already on this host only drops the prefix", () => {
		expect(location("https://docs.trajectonomics.com/docs/cli/")).toBe(`${SITE_ORIGIN}/cli/`)
		expect(location("http://docs.test/docs/llms.txt")).toBe("http://docs.test/llms.txt")
	})

	test("a retired path under the prefix resolves in the same redirect", () => {
		expect(location("https://trajectonomics.com/docs/developers/tax-core")).toBe(
			`${SITE_ORIGIN}/contribute/tax/`,
		)
		expect(location("https://trajectonomics.com/docs/developers/sim-core/")).toBe(
			`${SITE_ORIGIN}/contribute/`,
		)
	})

	test("a path that is not the old mount stays put", () => {
		expect(location("https://trajectonomics.com/cli/")).toBeNull()
		expect(location("https://docs.trajectonomics.com/cli/")).toBeNull()
		expect(location("http://docs.test/developers-notes/")).toBeNull()
	})
})
