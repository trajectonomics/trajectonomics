import { describe, expect, test } from "bun:test"
import { canonicalUrl, fileUrl } from "./page-url"

describe("the canonical URL", () => {
	test("is the Site's origin plus the page's path under /blog/", () => {
		expect(canonicalUrl("/blog/")).toBe("https://trajectonomics.com/blog/")
	})

	test("always ends in a slash, as every built address does", () => {
		expect(canonicalUrl("/blog/compare")).toBe("https://trajectonomics.com/blog/compare/")
	})

	test("refuses a relative path, which would name no page", () => {
		expect(() => canonicalUrl("compare/")).toThrow("not an absolute path")
	})
})

describe("a file's URL", () => {
	test("is the Site's origin plus the file's public path, with no slash added", () => {
		expect(fileUrl("/blog/posts/a/cover.webp")).toBe(
			"https://trajectonomics.com/blog/posts/a/cover.webp",
		)
	})

	test("refuses a relative path", () => {
		expect(() => fileUrl("cover.webp")).toThrow("not an absolute path")
	})
})
