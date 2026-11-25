import { page } from "$app/state"

/**
 * The address the page shows. A shallow navigation (`setQueryParam`) changes the address bar and
 * `page.shallow`, but not `page.url`, which stays the rendered page. So the visible address is
 * `page.shallow` when it is set, and `page.url` otherwise.
 */
export function visibleAddress(): { readonly pathname: string; readonly search: string } {
	const url = page.shallow?.url ?? page.url
	return { pathname: url.pathname, search: url.search }
}

/** The query string of the address bar. Reactive: a read in markup or `$derived` follows the address. */
export function currentSearch(): string {
	return visibleAddress().search
}

/** The path of the address bar, such as "/net-worth/". Reactive. */
export function currentPathname(): string {
	return visibleAddress().pathname
}

/**
 * The fragment of the address bar without its "#", or "" when it has none. Reactive, so a note linked
 * from Home highlights once the page it names has drawn it: the browser's `:target` is set before the
 * note exists, so it alone would not mark it.
 */
export function currentHash(): string {
	return (page.shallow?.url ?? page.url).hash.replace(/^#/, "")
}
