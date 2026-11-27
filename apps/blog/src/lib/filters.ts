import { LANGUAGES, type Language } from "./languages"
import { POST_TYPES, type PostType } from "./posts"
import { PRODUCTS, type Product } from "./products"

/**
 * The front page's filter groups, in the order the bar shows them. Each one is also the name of its
 * query parameter, so a filtered list has an address a reader can share: `?type=essay&language=th`.
 */
export const FILTER_GROUPS = Object.freeze(["type", "language", "product"] as const)

/** One filter group. */
export type FilterGroupName = (typeof FILTER_GROUPS)[number]

/** Every value each group can take, in the blog's order. */
export const GROUP_VALUES: Readonly<Record<FilterGroupName, readonly string[]>> = Object.freeze({
	type: POST_TYPES,
	language: LANGUAGES,
	product: PRODUCTS,
})

/** Whether a string names one of the front page's filter groups. */
export function isFilterGroup(value: string | null | undefined): value is FilterGroupName {
	return (
		value !== null && value !== undefined && (FILTER_GROUPS as readonly string[]).includes(value)
	)
}

/** The facts of a Post the filters read. */
export interface Filterable {
	readonly type: PostType
	readonly languages: readonly Language[]
	readonly products: readonly Product[]
}

/** The values one Post has in every group: one type, and any number of Languages and Products. */
export type FilterValues = Readonly<Record<FilterGroupName, readonly string[]>>

/** The values a reader chose, at most one per group; a group with none is not filtered. */
export type ChosenFilters = Readonly<Partial<Record<FilterGroupName, string>>>

/** The values one Post has in every group. */
export function filterValues(post: Filterable): FilterValues {
	return Object.freeze({ type: [post.type], language: post.languages, product: post.products })
}

/** One group the bar shows, with the values a reader can choose in it. */
export interface FilterGroup {
	readonly name: FilterGroupName
	readonly values: readonly string[]
}

/**
 * The groups the front page's bar shows. A value is offered only when at least one Post has it, and a
 * group only when choosing one of its values would leave some Post out: a filter that changes
 * nothing is noise.
 */
export function filterGroups(posts: readonly Filterable[]): readonly FilterGroup[] {
	const all = posts.map(filterValues)
	return Object.freeze(
		FILTER_GROUPS.flatMap((name) => {
			const values = GROUP_VALUES[name].filter((value) =>
				all.some((post) => post[name].includes(value)),
			)
			const narrows = values.some((value) => all.some((post) => !post[name].includes(value)))
			return values.length > 0 && narrows ? [Object.freeze({ name, values })] : []
		}),
	)
}

/** Whether a Post has every value a reader chose. */
export function matchesFilters(values: FilterValues, chosen: ChosenFilters): boolean {
	return FILTER_GROUPS.every((name) => {
		const value = chosen[name]
		return value === undefined || values[name].includes(value)
	})
}
