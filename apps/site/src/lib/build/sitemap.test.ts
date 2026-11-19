import { describe, expect, it } from "bun:test"
import { SITEMAP } from "../crawl/sitemap"
import { ABSOLUTE_CLEAN_URL } from "../language/languages"
import { checkSitemap } from "./sitemap"
import { codes, edited, sitemapEntry } from "./testing/crawl-files"

/** The `<loc>` line a healthy Sitemap carries, so a test can point it somewhere else. */
const LOC = new RegExp(`<loc>${ABSOLUTE_CLEAN_URL}</loc>`)

/** The one alternate a healthy Sitemap carries, so a test can point it somewhere else. */
const DEFAULT = /<xhtml:link rel="alternate" hreflang="x-default" href="[^"]*" \/>/

describe("the Sitemap of the Site's one address", () => {
	it("passes the Sitemap the build generates", () => {
		expect(codes(checkSitemap, [{ path: "sitemap.xml", content: SITEMAP }])).toEqual([])
	})

	it("fails a build that produced no Sitemap", () => {
		expect(codes(checkSitemap, [])).toEqual(["SITEMAP_MISSING"])
	})

	it("fails a Sitemap that lists no entry", () => {
		const empty = SITEMAP.replace(/ {2}<url>[\s\S]*?<\/url>\n/, "")
		expect(codes(checkSitemap, [{ path: "sitemap.xml", content: empty }])).toEqual([
			"SITEMAP_URL_MISSING",
		])
	})

	it("fails a Sitemap that lists the address twice", () => {
		expect(
			codes(checkSitemap, edited("sitemap.xml", /<\/urlset>/, `${sitemapEntry}</urlset>`)),
		).toEqual(["SITEMAP_URL_DUPLICATE"])
	})

	it("fails an entry that names a Language's build path, which is no address", () => {
		expect(
			codes(checkSitemap, edited("sitemap.xml", LOC, "<loc>https://trajectonomics.com/th/</loc>")),
		).toEqual(["SITEMAP_URL_UNKNOWN", "SITEMAP_URL_MISSING"])
	})

	it("fails an entry whose loc is that path on another origin", () => {
		expect(
			codes(checkSitemap, edited("sitemap.xml", LOC, "<loc>https://example.com/</loc>")),
		).toEqual(["SITEMAP_LOC_TARGET"])
	})

	it("fails an entry that names no alternate", () => {
		expect(codes(checkSitemap, edited("sitemap.xml", DEFAULT, ""))).toEqual([
			"SITEMAP_ALTERNATE_MISSING",
		])
	})

	it("fails an entry that names x-default twice", () => {
		const duplicate = `<xhtml:link rel="alternate" hreflang="x-default" href="${ABSOLUTE_CLEAN_URL}" />`
		expect(
			codes(
				checkSitemap,
				edited("sitemap.xml", LOC, `<loc>${ABSOLUTE_CLEAN_URL}</loc>\n    ${duplicate}`),
			),
		).toEqual(["SITEMAP_ALTERNATE_DUPLICATE"])
	})

	it("fails an alternate that is path-absolute rather than absolute", () => {
		expect(
			codes(
				checkSitemap,
				edited(
					"sitemap.xml",
					DEFAULT,
					'<xhtml:link rel="alternate" hreflang="x-default" href="/" />',
				),
			),
		).toEqual(["SITEMAP_ALTERNATE_TARGET"])
	})

	it("fails an alternate that names a Language's build path", () => {
		expect(
			codes(
				checkSitemap,
				edited(
					"sitemap.xml",
					DEFAULT,
					'<xhtml:link rel="alternate" hreflang="x-default" href="https://trajectonomics.com/th/" />',
				),
			),
		).toEqual(["SITEMAP_ALTERNATE_TARGET"])
	})
})
