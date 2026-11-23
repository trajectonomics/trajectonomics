/** One address in the sitemap, and the same page in each other Language it is written in. */
export interface SitemapEntry {
	readonly path: string
	readonly alternates?: readonly { readonly hreflang: string; readonly path: string }[]
}

/**
 * The sitemap for the blog's host: one `<url>` per address, each absolute on `origin`, with an
 * `xhtml:link` per alternate so a search engine pairs a page with its Translations.
 */
export function sitemapXml(origin: string, entries: readonly SitemapEntry[]): string {
	const urls = entries.map((entry) => {
		const links = (entry.alternates ?? []).map(
			(alternate) =>
				`<xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${new URL(alternate.path, origin).href}" />`,
		)
		return `\t<url><loc>${new URL(entry.path, origin).href}</loc>${links.join("")}</url>`
	})
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...urls,
		"</urlset>",
		"",
	].join("\n")
}
