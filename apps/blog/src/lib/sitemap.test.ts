import { describe, expect, test } from "bun:test"
import { sitemapXml } from "./sitemap"

describe("the sitemap", () => {
	const xml = sitemapXml("https://blog.trajectonomics.com", ["/", "/guides/a/"])

	test("lists every address, absolute on the blog's host", () => {
		expect(xml).toContain("<loc>https://blog.trajectonomics.com/</loc>")
		expect(xml).toContain("<loc>https://blog.trajectonomics.com/guides/a/</loc>")
	})

	test("is a sitemaps.org url set", () => {
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
		expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
	})
})
