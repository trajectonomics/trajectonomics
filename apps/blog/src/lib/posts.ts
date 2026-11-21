/** What kind of Post it is; the front page filters by it. */
export const POST_TYPES = Object.freeze(["compare", "guide", "news"] as const)

/** One Post Type. */
export type PostType = (typeof POST_TYPES)[number]

/** The folder each Post Type's addresses live under. */
const TYPE_FOLDERS: Readonly<Record<PostType, string>> = Object.freeze({
	compare: "compare",
	guide: "guides",
	news: "news",
})

/** The label each Post Type's meta line shows. */
const TYPE_LABELS: Readonly<Record<PostType, string>> = Object.freeze({
	compare: "Compare",
	guide: "Guide",
	news: "News",
})

/** The label a Post Type's meta line shows. */
export function typeLabel(type: PostType): string {
	return TYPE_LABELS[type]
}

/** The facts about a Post the lists and its address need. */
export interface PostSummary {
	readonly slug: string
	readonly type: PostType
	readonly publishedOn: Date
	readonly draft: boolean
}

/** The address of a Post: its type's folder, then its slug, with the trailing slash. */
export function postPath(post: Pick<PostSummary, "slug" | "type">): string {
	return `/${TYPE_FOLDERS[post.type]}/${post.slug}/`
}

/** The Posts a reader sees, newest first; a draft is never one of them. */
export function publishedNewestFirst<T extends PostSummary>(posts: readonly T[]): readonly T[] {
	return Object.freeze(
		posts
			.filter((post) => !post.draft)
			.toSorted((a, b) => b.publishedOn.getTime() - a.publishedOn.getTime()),
	)
}

/** The words a reader reads per minute, for the meta line's reading time. */
const WORDS_PER_MINUTE = 220

/** Whole minutes to read a Post's text, and never less than one. */
export function readingMinutes(text: string): number {
	const words = text.split(/\s+/).filter((word) => word !== "").length
	return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

/** A publication date as the meta line shows it, such as `22 Nov 2026`, read in UTC. */
export function displayDate(date: Date): string {
	return new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(date)
}
