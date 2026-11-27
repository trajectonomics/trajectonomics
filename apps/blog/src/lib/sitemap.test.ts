import { describe, expect, test } from "bun:test"
import { sitemapXml } from "./sitemap"

describe("the sitemap", () => {
	const xml = sitemapXml("https://trajectonomics.com", [
		{ path: "/blog/" },
		{
			path: "/blog/guides/a/",
			alternates: [
				{ hreflang: "en", path: "/blog/guides/a/" },
				{ hreflang: "th", path: "/blog/th/guides/a/" },
			],
		},
	])

	test("lists every address, absolute on the Site's origin", () => {
		expect(xml).toContain("<loc>https://trajectonomics.com/blog/</loc>")
		expect(xml).toContain("<loc>https://trajectonomics.com/blog/guides/a/</loc>")
	})

	test("names each address's alternates, absolute on the Site's origin", () => {
		expect(xml).toContain(
			'<xhtml:link rel="alternate" hreflang="th" href="https://trajectonomics.com/blog/th/guides/a/" />',
		)
	})

	test("is a sitemaps.org url set that declares the xhtml namespace", () => {
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
		expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
		expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
	})
})
