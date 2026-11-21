import { ABSOLUTE_CLEAN_URL } from "../language/languages"
import { SITE_ORIGIN } from "../site"

/** The Sitemap's built path, relative to the Worker's assets root. */
export const SITEMAP_FILE = "sitemap.xml"

/** The Sitemap's URL on the Site's own origin, the absolute line the Robots file names. */
export const SITEMAP_URL = `${SITE_ORIGIN}/${SITEMAP_FILE}`

/**
 * The Sitemap: one `<url>` at the Site's one address, naming `x-default` at that same address.
 * A second address no longer exists, so no per-Language alternate can be listed. It carries no
 * `lastmod`: the repository holds no truthful last-change date, and a wrong one is worse than none.
 */
export const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${ABSOLUTE_CLEAN_URL}</loc>
    <xhtml:link rel="alternate" hreflang="x-default" href="${ABSOLUTE_CLEAN_URL}" />
  </url>
</urlset>
`

/** Every absolute URL the Sitemap lists: the Site's one address. */
export const SITEMAP_URLS: readonly string[] = Object.freeze([ABSOLUTE_CLEAN_URL])
