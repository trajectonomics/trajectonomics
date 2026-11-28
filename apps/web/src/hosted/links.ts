import { withSearch as withPathSearch } from "../lib/view/links"
import { HOSTED_BASE as base } from "./overrides"

/**
 * A path on the Dashboard under the base path: "/tax/" is "/demo/tax/". A path that already holds it is left
 * alone, and so is a fragment: "#check-x" stays on the page it is in.
 */
export function withBase(path: string): string {
	if (path.startsWith("#")) return path
	return path.startsWith(`${base}/`) ? path : `${base}${path}`
}

/**
 * A path with the parameters of a query string added to it, under the base path. A parameter the path
 * states replaces the page's value of the same name, as in the loopback build's `withSearch`.
 */
export function withSearch(path: string, search: string): string {
	return withBase(withPathSearch(path, search))
}
