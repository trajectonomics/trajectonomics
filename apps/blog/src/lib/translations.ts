import { inBlogOrder, isLanguage, type Language } from "./languages"
import type { PostType } from "./posts"
import { inProductOrder, type Product } from "./products"

/**
 * One Translation's place: `<slug>/<language>.md` under `src/content/posts/`, which the content
 * loader names `<slug>/<language>`.
 */
export function translationPlace(id: string): { slug: string; language: Language } {
	const [slug, language, ...rest] = id.split("/")
	if (slug === undefined || slug === "" || language === undefined || rest.length > 0) {
		throw new Error(`Post "${id}" is not at <slug>/<language>.md`)
	}
	if (!isLanguage(language)) {
		throw new Error(`Post "${id}" is written in "${language}", which the blog does not know`)
	}
	return { slug, language }
}

/** The facts every Translation of one Post states the same way, because they are the Post's own. */
export interface TranslationFacts {
	readonly slug: string
	readonly language: Language
	readonly type: PostType
	readonly products: readonly Product[]
	readonly publishedOn: Date
	readonly draft: boolean
	readonly cover: { readonly src: string; readonly width: number; readonly height: number }
}

/** One Post: its shared facts and its Translations, in the blog's Language order. */
export interface PostGroup<T extends TranslationFacts> {
	readonly slug: string
	readonly type: PostType
	readonly products: readonly Product[]
	readonly publishedOn: Date
	readonly draft: boolean
	readonly languages: readonly Language[]
	readonly translations: ReadonlyMap<Language, T>
}

/** Whether two Product lists name the same Products, regardless of order or duplicates. */
function sameProducts(a: readonly Product[], b: readonly Product[]): boolean {
	const left = inProductOrder(a)
	const right = inProductOrder(b)
	return left.length === right.length && left.every((product, index) => product === right[index])
}

/** The first shared fact two Translations of one Post disagree on, or `undefined`. */
function disagreement(a: TranslationFacts, b: TranslationFacts): string | undefined {
	if (a.type !== b.type) return "type"
	if (!sameProducts(a.products, b.products)) return "products"
	if (a.publishedOn.getTime() !== b.publishedOn.getTime()) return "publishedOn"
	if (a.draft !== b.draft) return "draft"
	if (a.cover.src !== b.cover.src) return "cover.src"
	if (a.cover.width !== b.cover.width || a.cover.height !== b.cover.height) return "cover size"
	return undefined
}

/** Groups Translations into Posts, and refuses a Post whose Translations disagree on a shared fact. */
export function groupTranslations<T extends TranslationFacts>(
	translations: readonly T[],
): readonly PostGroup<T>[] {
	const bySlug = new Map<string, T[]>()
	for (const translation of translations) {
		bySlug.set(translation.slug, [...(bySlug.get(translation.slug) ?? []), translation])
	}
	return Object.freeze(
		[...bySlug.entries()].map(([slug, group]) => {
			const [first, ...rest] = group
			if (first === undefined) throw new Error(`Post "${slug}" has no Translation`)
			for (const other of rest) {
				const fact = disagreement(first, other)
				if (fact !== undefined) {
					throw new Error(
						`Post "${slug}": the ${first.language} and ${other.language} Translations disagree on ${fact}`,
					)
				}
			}
			const languages = inBlogOrder(group.map((translation) => translation.language))
			const byLanguage = new Map(group.map((translation) => [translation.language, translation]))
			return Object.freeze({
				slug,
				type: first.type,
				products: inProductOrder(first.products),
				publishedOn: first.publishedOn,
				draft: first.draft,
				languages,
				translations: byLanguage,
			})
		}),
	)
}
