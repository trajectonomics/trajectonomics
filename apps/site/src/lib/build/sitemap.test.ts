import { describe, expect, it } from "bun:test"
import { SITEMAP } from "../crawl/sitemap"
import type { Language } from "../language/language"
import { absoluteLocaleUrl, localeUrl } from "../language/languages"
import { SITE_ORIGIN } from "../site"
import { checkSitemap } from "./sitemap"
import { codes, edited, sitemapEntry } from "./testing/crawl-files"
import { entryAt } from "./testing/homes"

const HOME = entryAt(0).language
const OTHER = entryAt(1).language

/** The `<loc>` a healthy Sitemap carries for one Language's home. */
function loc(language: Language): RegExp {
	return new RegExp(`<loc>${absoluteLocaleUrl(language)}</loc>`)
}

/** One `xhtml:link` of a healthy Sitemap, so a test can point it somewhere else. */
function alternate(hreflang: string): RegExp {
	return new RegExp(`<xhtml:link rel="alternate" hreflang="${hreflang}" href="[^"]*" />`)
}

describe("the Sitemap of the Language homes", () => {
	it("passes a Sitemap that lists both homes with every Language and x-default", () => {
		expect(codes(checkSitemap)).toEqual([])
	})

	it("passes the Sitemap the build generates", () => {
		expect(codes(checkSitemap, [{ path: "sitemap.xml", content: SITEMAP }])).toEqual([])
	})

	it("fails a build that produced no Sitemap", () => {
		expect(codes(checkSitemap, [])).toEqual(["SITEMAP_MISSING"])
	})

	it("fails a Sitemap that leaves out a Language's home", () => {
		expect(codes(checkSitemap, edited("sitemap.xml", / {2}<url>[\s\S]*?<\/url>\n/, ""))).toEqual([
			"SITEMAP_URL_MISSING",
		])
	})

	it("fails a Sitemap that lists one home twice", () => {
		expect(
			codes(checkSitemap, edited("sitemap.xml", /<\/urlset>/, `${sitemapEntry(HOME)}</urlset>`)),
		).toEqual(["SITEMAP_URL_DUPLICATE"])
	})

	it("fails an entry whose loc is no Language's home, and the home it displaced", () => {
		expect(
			codes(checkSitemap, edited("sitemap.xml", loc(OTHER), `<loc>${SITE_ORIGIN}/de/</loc>`)),
		).toEqual(["SITEMAP_URL_UNKNOWN", "SITEMAP_URL_MISSING"])
	})

	it("fails an entry whose loc is that home's path on another origin", () => {
		expect(
			codes(
				checkSitemap,
				edited("sitemap.xml", loc(HOME), `<loc>https://example.com${localeUrl(HOME)}</loc>`),
			),
		).toEqual(["SITEMAP_LOC_TARGET"])
	})

	it("fails an entry that names no alternate for a Language", () => {
		expect(codes(checkSitemap, edited("sitemap.xml", alternate(OTHER), ""))).toEqual([
			"SITEMAP_ALTERNATE_MISSING",
		])
	})

	it("fails an entry that names one Language twice", () => {
		const duplicate = `<xhtml:link rel="alternate" hreflang="${OTHER}" href="${absoluteLocaleUrl(OTHER)}" />`
		expect(
			codes(
				checkSitemap,
				edited("sitemap.xml", loc(HOME), `<loc>${absoluteLocaleUrl(HOME)}</loc>\n    ${duplicate}`),
			),
		).toEqual(["SITEMAP_ALTERNATE_DUPLICATE"])
	})

	it("fails an alternate that is path-absolute rather than absolute", () => {
		expect(
			codes(
				checkSitemap,
				edited(
					"sitemap.xml",
					alternate(OTHER),
					`<xhtml:link rel="alternate" hreflang="${OTHER}" href="${localeUrl(OTHER)}" />`,
				),
			),
		).toEqual(["SITEMAP_ALTERNATE_TARGET"])
	})

	it("fails an x-default that is not the English home", () => {
		expect(
			codes(
				checkSitemap,
				edited(
					"sitemap.xml",
					alternate("x-default"),
					`<xhtml:link rel="alternate" hreflang="x-default" href="${absoluteLocaleUrl(HOME)}" />`,
				),
			),
		).toEqual(["SITEMAP_ALTERNATE_TARGET"])
	})
})
