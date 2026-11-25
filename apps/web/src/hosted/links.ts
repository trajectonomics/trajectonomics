import { HOSTED_BASE as base } from "./overrides"

/** A path on the Dashboard under the base path: "/tax/" is "/demo/tax/". A path that already holds it is left alone. */
export function withBase(path: string): string {
	return path.startsWith(`${base}/`) ? path : `${base}${path}`
}

/** A path with the parameters of a query string added to it, under the base path. */
export function withSearch(path: string, search: string): string {
	const query = new URLSearchParams(search).toString()
	if (query === "") return withBase(path)
	return `${withBase(path)}${path.includes("?") ? "&" : "?"}${query}`
}
