import { LANGUAGES, treePath } from "./languages"
import { type PostType, postPath } from "./posts"

/** A Post whose type changed, so its address moved from one type's folder to another's. */
export interface MovedPost {
	readonly slug: string
	readonly from: PostType
	readonly to: PostType
}

/**
 * Every Post that changed type after it was published, in chronological order. Its old addresses
 * keep answering with a permanent redirect to its current address in every Language Tree, so no
 * link anyone shared breaks. Append a line here when a Post's `type` changes; never remove one.
 */
export const MOVED_POSTS: readonly MovedPost[] = Object.freeze([
	// 2026-11-28: the Post Types grew from compare, guide and news to five.
	Object.freeze({ slug: "ai-model-tier-breakdown", from: "guide", to: "compare" }),
	Object.freeze({ slug: "ai-subscription-by-budget", from: "guide", to: "compare" }),
	Object.freeze({ slug: "ai-subscribe-1000-baht", from: "guide", to: "compare" }),
	Object.freeze({ slug: "one-answer-every-time", from: "guide", to: "essay" }),
	Object.freeze({ slug: "review-proof-not-code", from: "guide", to: "essay" }),
	Object.freeze({ slug: "software-factory", from: "guide", to: "essay" }),
	Object.freeze({ slug: "software-factory-7-things", from: "guide", to: "essay" }),
])

/** One permanent redirect from an old public path to the new one. */
export interface Redirect {
	readonly from: string
	readonly to: string
}

/** Collapses a chronological move history per slug into every former type -> latest type. */
function resolvedMoves(moved: readonly MovedPost[]): readonly MovedPost[] {
	const history = new Map<string, { sources: Set<PostType>; current: PostType }>()
	for (const move of moved) {
		const entry = history.get(move.slug) ?? { sources: new Set<PostType>(), current: move.to }
		entry.sources.add(move.from)
		entry.sources.add(move.to)
		entry.current = move.to
		history.set(move.slug, entry)
	}
	return [...history.entries()].flatMap(([slug, { sources, current }]) =>
		[...sources]
			.filter((from) => from !== current)
			.map((from) => Object.freeze({ slug, from, to: current })),
	)
}

/**
 * The redirects the moved Posts need: in every Language Tree, every former address (with and
 * without its trailing slash) points straight to the Post's current address.
 */
export function movedPostRedirects(moved: readonly MovedPost[]): readonly Redirect[] {
	return Object.freeze(
		resolvedMoves(moved).flatMap((post) =>
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
