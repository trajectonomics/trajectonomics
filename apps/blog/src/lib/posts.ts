import type { Language } from "./languages"

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

/**
 * Whole minutes to read a Post's text, and never less than one. Words are counted by the
 * Language's own word breaker, because Thai writes no space between words. A link's address and an
 * HTML tag are not read, so they are not counted.
 */
export function readingMinutes(text: string, language: Language): number {
	const prose = text.replace(/\]\([^)]*\)/g, "]").replace(/<[^>]*>/g, " ")
	const segmenter = new Intl.Segmenter(language, { granularity: "word" })
	let words = 0
	for (const segment of segmenter.segment(prose)) {
		if (segment.isWordLike === true) words += 1
	}
	return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

/**
 * A publication date as the meta line shows it, read in UTC, in a Dictionary's date locale:
 * `22 Nov 2026` in English, `22 พ.ย. 2569` in Thai.
 */
export function displayDate(date: Date, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(date)
}
