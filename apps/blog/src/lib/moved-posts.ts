import { LANGUAGES, treePath } from "./languages"
import { type PostType, postPath } from "./posts"

/** A Post whose type changed, so its address moved from one type's folder to another's. */
export interface MovedPost {
	readonly slug: string
	readonly from: PostType
	readonly to: PostType
}

/**
 * Every Post that changed type after it was published. Its old address keeps answering with a
 * permanent redirect in every Language Tree, so no link anyone shared breaks. Add a line here when a
 * Post's `type` changes; never remove one.
 */
export const MOVED_POSTS: readonly MovedPost[] = Object.freeze([
	// 2026-11-28: the Post Types grew from compare, guide and news to five.
	{ slug: "ai-model-tier-breakdown", from: "guide", to: "compare" },
	{ slug: "ai-subscription-by-budget", from: "guide", to: "compare" },
	{ slug: "ai-subscribe-1000-baht", from: "guide", to: "compare" },
	{ slug: "one-answer-every-time", from: "guide", to: "essay" },
	{ slug: "review-proof-not-code", from: "guide", to: "essay" },
	{ slug: "software-factory", from: "guide", to: "essay" },
	{ slug: "software-factory-7-things", from: "guide", to: "essay" },
])

/** One permanent redirect from an old public path to the new one. */
export interface Redirect {
	readonly from: string
	readonly to: string
}

/**
 * The redirects the moved Posts need: in every Language Tree, the old address with and without its
 * trailing slash goes to the new one.
 */
export function movedPostRedirects(moved: readonly MovedPost[]): readonly Redirect[] {
	return Object.freeze(
		moved.flatMap((post) =>
			LANGUAGES.flatMap((language) => {
				const from = treePath(language, postPath({ slug: post.slug, type: post.from }))
				const to = treePath(language, postPath({ slug: post.slug, type: post.to }))
				return [Object.freeze({ from, to }), Object.freeze({ from: from.replace(/\/$/, ""), to })]
			}),
		),
	)
}

/**
 * The `_redirects` file Workers Static Assets reads from the build root. Its paths are public paths,
 * with the blog's base, because `assets.base_path` does not strip it from them.
 */
export function redirectsFile(redirects: readonly Redirect[]): string {
	return redirects.map((redirect) => `${redirect.from} ${redirect.to} 301\n`).join("")
}
