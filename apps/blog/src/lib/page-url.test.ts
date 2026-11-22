import { describe, expect, test } from "bun:test"
import { canonicalUrl, fileUrl } from "./page-url"

describe("the canonical URL", () => {
	test("is the blog's host plus the page's path", () => {
		expect(canonicalUrl("/")).toBe("https://blog.trajectonomics.com/")
	})

	test("always ends in a slash, as every built address does", () => {
		expect(canonicalUrl("/compare")).toBe("https://blog.trajectonomics.com/compare/")
	})

	test("refuses a relative path, which would name no page", () => {
		expect(() => canonicalUrl("compare/")).toThrow("not an absolute path")
	})
})

describe("a file's URL", () => {
	test("is the blog's host plus the file's path, with no slash added", () => {
		expect(fileUrl("/posts/a/cover.webp")).toBe(
			"https://blog.trajectonomics.com/posts/a/cover.webp",
		)
	})

	test("refuses a relative path", () => {
		expect(() => fileUrl("cover.webp")).toThrow("not an absolute path")
	})
})
