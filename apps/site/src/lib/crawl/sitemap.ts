import { ABSOLUTE_CLEAN_URL } from "../language/languages"
import { SITE_ORIGIN } from "../site"
import { ABSOLUTE_OPENJOT_URL } from "../site/openjot"

/** The Sitemap's built path, relative to the Worker's assets root. */
export const SITEMAP_FILE = "sitemap.xml"

/** The Sitemap's URL on the Site's own origin, the absolute line the Robots file names. */
export const SITEMAP_URL = `${SITE_ORIGIN}/${SITEMAP_FILE}`

/** One address the Sitemap lists: the path a visitor reaches and its absolute form. */
export interface SitemapPage {
	readonly path: string
	readonly url: string
}

/** The Site's addresses: its home, and the OpenJot page (ADR 0032). */
export const SITEMAP_PAGES: readonly SitemapPage[] = Object.freeze([
	Object.freeze({ path: "/", url: ABSOLUTE_CLEAN_URL }),
	Object.freeze({ path: "/openjot/", url: ABSOLUTE_OPENJOT_URL }),
])

/** One `<url>`: the address, and `x-default` naming that same address. */
function entryOf(page: SitemapPage): string {
	return `  <url>
    <loc>${page.url}</loc>
    <xhtml:link rel="alternate" hreflang="x-default" href="${page.url}" />
  </url>`
}

/**
 * The Sitemap: one `<url>` per address, each naming `x-default` at that same address. No per-Language
 * alternate can be listed, because the Site has one address per page. It carries no `lastmod`: the
 * repository holds no truthful last-change date, and a wrong one is worse than none.
 */
export const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${SITEMAP_PAGES.map(entryOf).join("\n")}
</urlset>
`

/** Every absolute URL the Sitemap lists, which is also what the IndexNow payload submits. */
export const SITEMAP_URLS: readonly string[] = Object.freeze(SITEMAP_PAGES.map((page) => page.url))
