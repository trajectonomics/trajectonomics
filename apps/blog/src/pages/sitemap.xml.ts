import type { APIRoute } from "astro"
import { readPosts } from "../content/read-posts"
import { BLOG_PATH, SITE_ORIGIN } from "../lib/site"
import { sitemapXml } from "../lib/sitemap"

/** The front page and every published Post. */
export const GET: APIRoute = async () => {
	const posts = await readPosts()
	const paths = [BLOG_PATH, ...posts.map((post) => post.path)]
	return new Response(sitemapXml(SITE_ORIGIN, paths), {
		headers: { "content-type": "application/xml; charset=utf-8" },
	})
}
