import { navPath as pathOf, pageTitle as titleOf } from "../lib/view/routes"
import { HOSTED_BASE as base } from "./overrides"

export * from "../lib/view/routes"

/** A path without the base path: "/demo/tax/" is "/tax/". */
function withoutBase(path: string): string {
	return path.startsWith(`${base}/`) ? path.slice(base.length) : path
}

/** The navigation's page a path belongs to, whether the path holds the base path or not. */
export function navPath(path: string): string {
	return pathOf(withoutBase(path))
}

/** The heading of the page at a path, whether the path holds the base path or not. */
export function pageTitle(path: string): string {
	return titleOf(withoutBase(path))
}
