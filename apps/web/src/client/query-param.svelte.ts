import { goto } from "$app/navigation"
import { page } from "$app/state"
import { paramOf, withParam } from "./query-string"

/**
 * The address the page shows. A shallow navigation (`setQueryParam`) changes the address bar and
 * `page.shallow`, but not `page.url`, which stays the rendered page. So the visible address is
 * `page.shallow` when it is set, and `page.url` otherwise.
 */
function visibleAddress(): { readonly pathname: string; readonly search: string } {
	const url = page.shallow?.url ?? page.url
	return { pathname: url.pathname, search: url.search }
}

/**
 * One query parameter of the address bar as state, such as the Scenario a page shows. Read it in
 * markup or `$derived`. Route files only: a component receives the value as a prop.
 */
export function queryParam(name: string, fallback: string): string {
	return paramOf(visibleAddress().search, name, fallback)
}

/**
 * Sets one query parameter in the address bar. The entry is replaced rather than pushed, and no
 * load runs, so the page's state is a link a person can copy. The page keeps its focus and scroll.
 */
export function setQueryParam(name: string, value: string): Promise<void> {
	const address = visibleAddress()
	const search = withParam(address.search, name, value)
	return goto(`${address.pathname}${search}`, { replace: true, reset: false, shallow: true })
}
