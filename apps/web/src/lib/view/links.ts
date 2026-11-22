/**
 * A path with the parameters of a query string added to it. Every internal link on the Dashboard
 * goes through this, so `?demo=1` follows the reader from page to page.
 */
export function withSearch(path: string, search: string): string {
	const query = new URLSearchParams(search).toString()
	if (query === "") return path
	return `${path}${path.includes("?") ? "&" : "?"}${query}`
}
