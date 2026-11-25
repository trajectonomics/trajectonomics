import { type CollectionEntry, getCollection } from "astro:content"
import { chooseTranslation, type Language, treePath } from "../lib/languages"
import { type PostType, postPath, publishedNewestFirst, readingMinutes } from "../lib/posts"
import { groupTranslations, translationPlace } from "../lib/translations"

/** One Post in one Post Language, with its reading time worked out once. */
export interface Translation {
	readonly slug: string
	readonly language: Language
	readonly type: PostType
	readonly publishedOn: Date
	readonly draft: boolean
	readonly cover: CollectionEntry<"posts">["data"]["cover"]
	readonly minutes: number
	readonly entry: CollectionEntry<"posts">
}

/** A published Post: its shared facts and every Translation someone wrote. */
export interface Post {
	readonly slug: string
	readonly type: PostType
	readonly publishedOn: Date
	readonly draft: boolean
	/** The Post Languages it is written in, in the blog's order. */
	readonly languages: readonly Language[]
	readonly translations: ReadonlyMap<Language, Translation>
}

/** Every published Post, newest first. */
export async function readPosts(): Promise<readonly Post[]> {
	const entries = await getCollection("posts")
	const translations = entries.map((entry): Translation => {
		const { slug, language } = translationPlace(entry.id)
		return {
			slug,
			language,
			type: entry.data.type,
			publishedOn: entry.data.publishedOn,
			draft: entry.data.draft,
			cover: entry.data.cover,
			minutes: readingMinutes(entry.body ?? "", language),
			entry,
		}
	})
	return publishedNewestFirst(groupTranslations(translations))
}

/** The Translation a page in one Interface Language shows: its own, else the fallback. */
export function shownTranslation(post: Post, interfaceLanguage: Language): Translation {
	const language = chooseTranslation(post.languages, interfaceLanguage)
	const translation = post.translations.get(language)
	if (translation === undefined) {
		throw new Error(`Post "${post.slug}" has no ${language} Translation`)
	}
	return translation
}

/** The address of a Post's page in one Language Tree. */
export function postPagePath(post: Pick<Post, "slug" | "type">, language: Language): string {
	return treePath(language, postPath(post))
}
