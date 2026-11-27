import { describe, expect, test } from "bun:test"
import { PORTAL_ORIGIN } from "./site"
import { sitemapDocument, sitemapLocations } from "./sitemap"

const PAGE_PATHS = ["/cli/commands/tx/", "/", "/cli"]

describe("the Sitemap document", () => {
	test("a page is listed as an absolute URL with exactly one trailing slash", () => {
		expect(sitemapLocations(sitemapDocument(["/cli"]))).toEqual([`${PORTAL_ORIGIN}/cli/`])
	})

	test("the URLs are sorted", () => {
		expect(sitemapLocations(sitemapDocument(PAGE_PATHS))).toEqual([
			`${PORTAL_ORIGIN}/`,
			`${PORTAL_ORIGIN}/cli/`,
			`${PORTAL_ORIGIN}/cli/commands/tx/`,
		])
	})

	test("a page path given twice is listed once", () => {
		const document = sitemapDocument(["/cli/", "/cli"])

		expect(sitemapLocations(document)).toEqual([`${PORTAL_ORIGIN}/cli/`])
	})

	test("it carries no lastmod, changefreq, priority or hreflang", () => {
		const document = sitemapDocument(["/"])

		expect(document).not.toContain("<lastmod>")
		expect(document).not.toContain("<changefreq>")
		expect(document).not.toContain("<priority>")
		expect(document).not.toContain("hreflang")
	})

	test("a path with an unusual character round-trips through the escaped document", () => {
		const document = sitemapDocument(["/a&b/"])

		expect(document).toContain(`${PORTAL_ORIGIN}/a&amp;b/`)
		expect(sitemapLocations(document)).toEqual([`${PORTAL_ORIGIN}/a&b/`])
	})
})

describe("reading a Sitemap document", () => {
	test("a urlset with no url is a readable, empty document", () => {
		const document = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'

		expect(sitemapLocations(document)).toEqual([])
	})

	test("a document with no urlset is unreadable", () => {
		expect(sitemapLocations("<html><body>not a sitemap</body></html>")).toBeUndefined()
	})

	test("a urlset with no closing tag is unreadable", () => {
		expect(
			sitemapLocations("<urlset><url><loc>https://trajectonomics.com/docs/</loc></url>"),
		).toBeUndefined()
	})

	test("a url with no loc is unreadable", () => {
		expect(sitemapLocations("<urlset><url></url></urlset>")).toBeUndefined()
	})

	test("a url whose loc text is blank is unreadable", () => {
		expect(sitemapLocations("<urlset><url><loc>  </loc></url></urlset>")).toBeUndefined()
	})
})
