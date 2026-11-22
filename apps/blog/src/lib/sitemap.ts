/** The sitemap for the blog's host: one `<url>` per address, each absolute on `origin`. */
export function sitemapXml(origin: string, paths: readonly string[]): string {
	const urls = paths.map((path) => `\t<url><loc>${new URL(path, origin).href}</loc></url>`)
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls,
		"</urlset>",
		"",
	].join("\n")
}
