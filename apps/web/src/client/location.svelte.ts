import { page } from "$app/state"

/** The query string of the address bar. Reactive: a read in markup or `$derived` follows the address. */
export function currentSearch(): string {
	return page.url.search
}

/** The path of the address bar, such as "/net-worth/". Reactive. */
export function currentPathname(): string {
	return page.url.pathname
}
