import type { APIRoute } from "astro"
import { postPagePath, readPosts } from "../content/read-posts"
import { dictionaryFor } from "../lib/dictionary"
import { type LlmsPost, llmsTxt } from "../lib/llms-txt"
import { canonicalUrl } from "../lib/page-url"

/**
 * The blog's llms.txt: every English Post, newest first, with the front page's summary. A Post that is
 * not written in English is not listed, because the file lists the English pages only.
 */
export const GET: APIRoute = async () => {
	const posts = await readPosts()
	const english: LlmsPost[] = posts.flatMap((post) => {
		const translation = post.translations.get("en")
		if (translation === undefined) return []
		return [
			{
				title: translation.entry.data.title,
				url: canonicalUrl(postPagePath(post, "en")),
				description: translation.entry.data.description,
			},
		]
	})
	return new Response(llmsTxt({ summary: dictionaryFor("en").frontDescription, posts: english }), {
		headers: { "content-type": "text/plain; charset=utf-8" },
	})
}
