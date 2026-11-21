/** The value of one query parameter, or the fallback when the query string does not set it. */
export function paramOf(search: string, name: string, fallback: string): string {
	return new URLSearchParams(search).get(name) ?? fallback
}

/** The query string with one parameter set, or removed when the value is "". Starts with "?" or is "". */
export function withParam(search: string, name: string, value: string): string {
	const params = new URLSearchParams(search)
	if (value === "") params.delete(name)
	else params.set(name, value)
	const query = params.toString()
	return query === "" ? "" : `?${query}`
}
