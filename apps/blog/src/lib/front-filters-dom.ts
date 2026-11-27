import { filterQuery, nextFilterValue } from "./filter-query"
import {
	type ChosenFilters,
	type FilterGroup,
	type FilterGroupName,
	isFilterGroup,
	matchesFilters,
} from "./filters"

const wordsOf = (raw: string | null): readonly string[] =>
	raw === null || raw.trim() === "" ? [] : raw.trim().split(/\s+/)

/** The filter value an option element represents, or `undefined` for "All". */
export function optionValue(option: HTMLAnchorElement): string | undefined {
	const raw = option.getAttribute("data-filter-value") ?? ""
	return raw === "" ? undefined : raw
}

/** Reads the offered groups and their values straight from the rendered filter options. */
export function offeredGroups(options: readonly HTMLAnchorElement[]): readonly FilterGroup[] {
	const byGroup = new Map<FilterGroupName, string[]>()
	for (const option of options) {
		const group = option.getAttribute("data-filter-group")
		const value = optionValue(option)
		if (isFilterGroup(group) && value !== undefined) {
			byGroup.set(group, [...(byGroup.get(group) ?? []), value])
		}
	}
	return Object.freeze(
		[...byGroup.entries()].map(([name, values]) =>
			Object.freeze({ name, values: Object.freeze(values) }),
		),
	)
}

/** Updates `aria-current` and `href` on every filter option to reflect the active filters. */
export function syncOptions(
	options: readonly HTMLAnchorElement[],
	basePath: string,
	chosen: ChosenFilters,
	search: URLSearchParams,
): void {
	for (const option of options) {
		const group = option.getAttribute("data-filter-group")
		if (!isFilterGroup(group)) continue
		const value = optionValue(option)
		if (chosen[group] === value) option.setAttribute("aria-current", "true")
		else option.removeAttribute("aria-current")
		const target = nextFilterValue(chosen, group, value)
		option.href = `${basePath}${filterQuery(chosen, group, target, search)}`
	}
}

/** Shows matching Posts, hides non-matching ones and an empty grid, and returns the visible count. */
export function filterItems(
	items: readonly HTMLElement[],
	grid: HTMLElement | null,
	chosen: ChosenFilters,
): number {
	let visible = 0
	for (const item of items) {
		const values = {
			type: wordsOf(item.getAttribute("data-type")),
			language: wordsOf(item.getAttribute("data-language")),
			product: wordsOf(item.getAttribute("data-product")),
		}
		const show = matchesFilters(values, chosen)
		item.hidden = !show
		if (show) visible += 1
	}
	if (grid !== null) {
		grid.hidden = [...grid.querySelectorAll<HTMLElement>("[data-filter-item]")].every(
			(item) => item.hidden,
		)
	}
	return visible
}
