import { SITEMAP } from "../lib/crawl/sitemap"

/** The Sitemap: the build writes it to the assets root as `sitemap.xml`, which the Worker serves. */
export function GET(): Response {
	return new Response(SITEMAP, { headers: { "content-type": "application/xml" } })
}
