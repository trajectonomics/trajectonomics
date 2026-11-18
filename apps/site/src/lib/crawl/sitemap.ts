import { FALLBACK_LANGUAGE, type Language } from "../language/language"
import { absoluteLocaleUrl, LANGUAGES } from "../language/languages"
import { SITE_ORIGIN } from "../site"

/** The Sitemap's built path, relative to the Worker's assets root. */
export const SITEMAP_FILE = "sitemap.xml"

/** The Sitemap's URL on the Site's own origin, the absolute line the Robots file names. */
export const SITEMAP_URL = `${SITE_ORIGIN}/${SITEMAP_FILE}`

/** The self-closed `xhtml:link` an entry carries for one `hreflang`. */
function alternate(hreflang: string, href: string): string {
	return `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`
}

/** One `<url>`: a Language's home, and every Language's alternate plus `x-default`. */
function entry(language: Language): string {
	const alternates = [
		...LANGUAGES.map((other) => alternate(other.language, absoluteLocaleUrl(other.language))),
		alternate("x-default", absoluteLocaleUrl(FALLBACK_LANGUAGE)),
	].join("\n")
	return `  <url>\n    <loc>${absoluteLocaleUrl(language)}</loc>\n${alternates}\n  </url>`
}

/**
 * The Sitemap: one `<url>` per Language home in `LANGUAGES` order, each naming every Language's
 * alternate and `x-default` at the English home. It carries no `lastmod`: the repository holds no
 * truthful last-change date, and a wrong one is worse than none.
 */
export const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGUAGES.map((other) => entry(other.language)).join("\n")}
</urlset>
`

/** Every absolute URL the Sitemap lists: one per Language home, in `LANGUAGES` order. */
export const SITEMAP_URLS: readonly string[] = Object.freeze(
	LANGUAGES.map((entry) => absoluteLocaleUrl(entry.language)),
)
