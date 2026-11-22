/**
 * The href a page link carries: its path with the trailing slash `trailingSlash: "always"` serves
 * (astro.config.ts). Absolute links are returned unchanged.
 */
export function pageHref(url: string): string {
	return url.startsWith("http") || url.endsWith("/") ? url : `${url}/`
}
