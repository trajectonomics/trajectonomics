import { dictionaryFor } from "./dictionary"
import { chosenFilters, filterQuery, nextFilterValue } from "./filter-query"
import { type ChosenFilters, isFilterGroup } from "./filters"
import { filterItems, offeredGroups, optionValue, syncOptions } from "./front-filters-dom"
import { isLanguage } from "./languages"

/** Wires the front page's filter bar: reveals it, syncs the URL, and announces result changes. */
export function initFrontFilters(root: Document = document): void {
	const bar = root.querySelector<HTMLElement>("[data-filter-bar]")
	if (bar === null) return
	const basePath = bar.getAttribute("data-base-path") ?? window.location.pathname
	const lang = bar.getAttribute("data-language")
	const words = dictionaryFor(lang !== null && isLanguage(lang) ? lang : "en")
	const options = [...bar.querySelectorAll<HTMLAnchorElement>("[data-filter-option]")]
	const items = [...root.querySelectorAll<HTMLElement>("[data-filter-item]")]
	const grid = root.querySelector<HTMLElement>("[data-filter-grid]")
	const empty = root.querySelector<HTMLElement>("[data-filter-empty]")
	const status = root.querySelector<HTMLElement>("[data-filter-status]")
	const offered = offeredGroups(options)
	let current: ChosenFilters = {}

	const apply = (search: URLSearchParams, announce: boolean): void => {
		current = chosenFilters(search, offered)
		const visible = filterItems(items, grid, current)
		if (empty !== null) empty.hidden = visible > 0
		if (status !== null && announce) status.textContent = words.filterResults(visible)
		syncOptions(options, basePath, current, search)
	}

	const onClick = (option: HTMLAnchorElement, event: MouseEvent): void => {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
			return
		}
		const group = option.getAttribute("data-filter-group")
		if (!isFilterGroup(group)) return
		event.preventDefault()
		const search = new URLSearchParams(window.location.search)
		const next = nextFilterValue(current, group, optionValue(option))
		const query = filterQuery(current, group, next, search)
		const nextUrl = `${basePath}${query}`
		if (nextUrl !== `${window.location.pathname}${window.location.search}`) {
			window.history.pushState(null, "", nextUrl)
		}
		apply(new URLSearchParams(query), true)
	}

	for (const option of options) option.addEventListener("click", (event) => onClick(option, event))
	window.addEventListener("popstate", () =>
		apply(new URLSearchParams(window.location.search), true),
	)
	apply(new URLSearchParams(window.location.search), false)
	bar.hidden = false
}
