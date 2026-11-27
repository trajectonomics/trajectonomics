/**
 * A path with the parameters of a query string added to it. Every internal link on the Dashboard
 * goes through this, so `?demo=1` follows the reader from page to page. A parameter the path states
 * replaces the page's value of the same name, so a link that names a plan never stacks a second
 * `scenario` on the address: the path's parameters come first, then the page's others.
 */
export function withSearch(path: string, search: string): string {
	const mark = path.indexOf("?")
	const stated = new Set(new URLSearchParams(mark === -1 ? "" : path.slice(mark + 1)).keys())
	const page = new URLSearchParams(search)
	for (const name of stated) page.delete(name)
	const query = page.toString()
	if (query === "") return path
	const join = mark === -1 ? "?" : path.length === mark + 1 ? "" : "&"
	return `${path}${join}${query}`
}
