/** The URL a built page is served at: a directory index becomes its directory, with a trailing slash. */
export function pageUrl(path: string): string {
	return `/${path.replace(/(^|\/)index\.html$/, "$1")}`
}
