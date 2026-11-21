import { goto } from "$app/navigation"
import { page } from "$app/state"
import { paramOf, withParam } from "./query-string"

/**
 * One query parameter of the address bar as state, such as the Scenario a page shows. Read it in
 * markup or `$derived`. Route files only: a component receives the value as a prop.
 */
export function queryParam(name: string, fallback: string): string {
	return paramOf(page.url.search, name, fallback)
}

/**
 * Sets one query parameter in the address bar. The entry is replaced rather than pushed, and no
 * load runs, so the page's state is a link a person can copy.
 */
export function setQueryParam(name: string, value: string): Promise<void> {
	const search = withParam(page.url.search, name, value)
	return goto(`${page.url.pathname}${search}`, { replace: true, reset: false, shallow: true })
}
