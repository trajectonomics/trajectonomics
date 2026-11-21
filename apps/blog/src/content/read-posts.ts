import { type CollectionEntry, getCollection } from "astro:content"
import { type PostType, postPath, publishedNewestFirst, readingMinutes } from "../lib/posts"

/** A published Post, with its address and reading time worked out once for every page. */
export interface Post {
	readonly slug: string
	readonly type: PostType
	readonly publishedOn: Date
	readonly draft: boolean
	readonly path: string
	readonly minutes: number
	readonly entry: CollectionEntry<"posts">
}

/** Every published Post, newest first. */
export async function readPosts(): Promise<readonly Post[]> {
	const entries = await getCollection("posts")
	return publishedNewestFirst(
		entries.map((entry) => ({
			slug: entry.id,
			type: entry.data.type,
			publishedOn: entry.data.publishedOn,
			draft: entry.data.draft,
			path: postPath({ slug: entry.id, type: entry.data.type }),
			minutes: readingMinutes(entry.body ?? ""),
			entry,
		})),
	)
}
