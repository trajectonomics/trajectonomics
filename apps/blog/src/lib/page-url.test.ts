import { describe, expect, test } from "bun:test"
import { canonicalUrl } from "./page-url"

describe("the canonical URL", () => {
	test("is the apex origin plus the page's path", () => {
		expect(canonicalUrl("/blog/")).toBe("https://trajectonomics.com/blog/")
	})

	test("always ends in a slash, as every built address does", () => {
		expect(canonicalUrl("/blog/compare")).toBe("https://trajectonomics.com/blog/compare/")
	})

	test("refuses a relative path, which would name no page", () => {
		expect(() => canonicalUrl("blog/")).toThrow("not an absolute path")
	})
})
