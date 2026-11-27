import type { APIRoute } from "astro"
import { postPagePath, readPosts } from "../content/read-posts"
import { chooseTranslation, DEFAULT_LANGUAGE, LANGUAGES, treePath } from "../lib/languages"
import { BLOG_PATH, SITE_ORIGIN } from "../lib/site"
import { type SitemapEntry, sitemapXml } from "../lib/sitemap"

/**
 * Every tree's front page, and every Post in each Language it is written in. A page that falls
 * back to another Translation is not listed: its canonical is the native page.
 */
export const GET: APIRoute = async () => {
	const posts = await readPosts()
	const frontAlternates = [
		...LANGUAGES.map((language) => ({ hreflang: language, path: treePath(language, BLOG_PATH) })),
		{ hreflang: "x-default", path: treePath(DEFAULT_LANGUAGE, BLOG_PATH) },
	]
	const fronts: SitemapEntry[] = LANGUAGES.map((language) => ({
		path: treePath(language, BLOG_PATH),
		alternates: frontAlternates,
	}))
	const postEntries: SitemapEntry[] = posts.flatMap((post) => {
		const alternates = [
			...post.languages.map((language) => ({
				hreflang: language,
				path: postPagePath(post, language),
			})),
			{
				hreflang: "x-default",
				path: postPagePath(post, chooseTranslation(post.languages, DEFAULT_LANGUAGE)),
			},
		]
		return post.languages.map((language) => ({ path: postPagePath(post, language), alternates }))
	})
	return new Response(sitemapXml(SITE_ORIGIN, [...fronts, ...postEntries]), {
		headers: { "content-type": "application/xml; charset=utf-8" },
	})
}
