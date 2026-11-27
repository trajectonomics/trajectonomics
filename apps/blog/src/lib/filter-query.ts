import {
	type ChosenFilters,
	FILTER_GROUPS,
	type FilterGroup,
	type FilterGroupName,
	GROUP_VALUES,
} from "./filters"

/**
 * The values an address chose: one known value per group, and nothing else. When `offered` is given,
 * values outside the offered groups are dropped so an unoffered query parameter cannot trap the
 * reader on an empty list with no control to clear it.
 */
export function chosenFilters(
	search: URLSearchParams,
	offered?: readonly FilterGroup[],
): ChosenFilters {
	const allowed =
		offered === undefined
			? GROUP_VALUES
			: Object.fromEntries(offered.map((group) => [group.name, group.values]))
	const chosen: Partial<Record<FilterGroupName, string>> = {}
	for (const name of FILTER_GROUPS) {
		const value = search.get(name)
		if (value !== null && allowed[name]?.includes(value)) {
			chosen[name] = value
		}
	}
	return Object.freeze(chosen)
}

/**
 * The next value for a group when a reader clicks an option: clicking an already-active value
 * toggles it off (`undefined`), and clicking "All" (`undefined`) clears the group.
 */
export function nextFilterValue(
	chosen: ChosenFilters,
	group: FilterGroupName,
	value: string | undefined,
): string | undefined {
	return value !== undefined && chosen[group] === value ? undefined : value
}

/**
 * The query an option links to: the current choice with one group set to a value, or cleared when
 * the value is `undefined`. Any unrelated parameters in `preserve` (such as `utm_*`) stay intact,
 * and filter parameters are written in bar order.
 */
export function filterQuery(
	chosen: ChosenFilters,
	name: FilterGroupName,
	value: string | undefined,
	preserve?: URLSearchParams,
): string {
	const next: ChosenFilters = { ...chosen, [name]: value }
	const search = new URLSearchParams()
	if (preserve !== undefined) {
		for (const [key, entry] of preserve.entries()) {
			if (!(FILTER_GROUPS as readonly string[]).includes(key)) {
				search.append(key, entry)
			}
		}
	}
	for (const group of FILTER_GROUPS) {
		const chosenValue = next[group]
		if (chosenValue !== undefined) search.set(group, chosenValue)
	}
	const query = search.toString()
	return query === "" ? "" : `?${query}`
}
